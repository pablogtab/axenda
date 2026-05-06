/**
 * Clients Integration Tests
 *
 * Tests the full CRUD flow for /clients and their tags against a real DB.
 * Setup: registers an org (ADMIN).
 * Cleanup: all created data is removed in afterAll.
 */
import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true })
process.env['NODE_ENV'] = 'test'

import request from 'supertest'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../app/app.module'
import { PrismaService } from '../prisma/prisma.service'

// ─── Test Data ────────────────────────────────────────────────────────────────

const slug = `clients-test-${Date.now()}`
const adminOrg = {
  organizationName: 'Clients Test Org',
  organizationSlug: slug,
  firstName: 'Admin',
  lastName: 'Test',
  email: `admin-cli-${Date.now()}@test.axenda.com`,
  password: 'AdminPass123!',
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Clients — Integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let adminToken: string
  let createdClientId: string
  let createdTagId: string

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    await app.init()

    prisma = moduleRef.get(PrismaService)

    // 1. Start registration
    await request(app.getHttpServer())
      .post('/api/auth/register-start')
      .send({
        organizationName: adminOrg.organizationName,
        email: adminOrg.email,
        turnstileToken: 'test-token',
      })

    // 2. Get code from DB
    const verification = await prisma.verificationCode.findUnique({
      where: { email: adminOrg.email },
    })

    // 3. Complete registration and get token
    const res = await request(app.getHttpServer())
      .post('/api/auth/register-complete')
      .send({
        email: adminOrg.email,
        code: verification!.code,
        firstName: adminOrg.firstName,
        lastName: adminOrg.lastName,
        password: adminOrg.password,
      })

    adminToken = res.body.data.accessToken
    const payload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64url').toString())
    tenantId = payload['tenantId'] as string
  })

  // ── Teardown ───────────────────────────────────────────────────────────────

  afterAll(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => null)
    }
    await app.close()
  })

  // ── Clients CRUD ───────────────────────────────────────────────────────────

  describe('POST /api/clients', () => {
    it('should create a new client', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Juan',
          lastName: 'Perez',
          email: 'juan@test.com',
          phone: '+5491122334455',
        })
        .expect(201)

      expect(res.body.data.firstName).toBe('Juan')
      expect(res.body.data.email).toBe('juan@test.com')
      createdClientId = res.body.data.id
    })

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Error',
          lastName: 'User',
          email: 'not-an-email',
        })
        .expect(400)
    })
  })

  describe('GET /api/clients', () => {
    it('should list clients', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data.items)).toBe(true)
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data.total).toBeDefined()
    })
  })

  describe('PATCH /api/clients/:id', () => {
    it('should update client details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Cliente frecuente' })
        .expect(200)

      expect(res.body.data.notes).toBe('Cliente frecuente')
    })
  })

  // ── Client Tags ────────────────────────────────────────────────────────────

  describe('POST /api/clients/:id/tags', () => {
    it('should add a tag to the client', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/clients/${createdClientId}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'VIP', color: '#FFD700' })
        .expect(201)

      expect(res.body.data.name).toBe('VIP')
      createdTagId = res.body.data.id
    })

    it('should reject invalid color hex', async () => {
      await request(app.getHttpServer())
        .post(`/api/clients/${createdClientId}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Error', color: 'red' })
        .expect(400)
    })
  })

  describe('GET /api/clients/:id', () => {
    it('should get client details including tags', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.id).toBe(createdClientId)
      expect(res.body.data.tags).toHaveLength(1)
      expect(res.body.data.tags[0].name).toBe('VIP')
    })
  })

  // ── DELETE endpoints ───────────────────────────────────────────────────────

  describe('DELETE', () => {
    it('should remove a tag from the client', async () => {
      await request(app.getHttpServer())
        .delete(`/api/clients/${createdClientId}/tags/${createdTagId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('should deactivate the client (soft delete)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.active).toBe(false)
    })
  })
})
