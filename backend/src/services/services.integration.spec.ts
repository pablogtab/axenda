/**
 * Services Integration Tests
 *
 * Tests the full CRUD flow for /services and /services/categories against a real DB.
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

const slug = `services-test-${Date.now()}`
const adminOrg = {
  organizationName: 'Services Test Org',
  organizationSlug: slug,
  firstName: 'Admin',
  lastName: 'Test',
  email: `admin-srv-${Date.now()}@test.axenda.com`,
  password: 'AdminPass123!',
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Services — Integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let adminToken: string
  let createdCategoryId: string
  let createdServiceId: string

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

  // ── Categories CRUD ────────────────────────────────────────────────────────

  describe('POST /api/services/categories', () => {
    it('should create a new category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/services/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cortes' })
        .expect(201)

      expect(res.body.data.name).toBe('Cortes')
      createdCategoryId = res.body.data.id
    })

    it('should reject missing name with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/services/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400)
    })
  })

  describe('GET /api/services/categories', () => {
    it('should list categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/services/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.some((c: any) => c.id === createdCategoryId)).toBe(true)
    })
  })

  describe('PATCH /api/services/categories/:id', () => {
    it('should update category name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/services/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cortes VIP' })
        .expect(200)

      expect(res.body.data.name).toBe('Cortes VIP')
    })
  })

  // ── Services CRUD ──────────────────────────────────────────────────────────

  describe('POST /api/services', () => {
    it('should create a new service linked to category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Corte Clásico',
          duration: 30,
          price: 15000,
          categoryId: createdCategoryId,
          color: '#123456',
        })
        .expect(201)

      expect(res.body.data).toMatchObject({
        name: 'Corte Clásico',
        duration: 30,
        price: '15000', // Postgres decimal can return as string depending on config, but API should be consistent.
        categoryId: createdCategoryId,
      })
      createdServiceId = res.body.data.id
    })

    it('should reject negative price', async () => {
      await request(app.getHttpServer())
        .post('/api/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Error', duration: 10, price: -5 })
        .expect(400)
    })

    it('should reject duration under 5 minutes', async () => {
      await request(app.getHttpServer())
        .post('/api/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Error', duration: 2 })
        .expect(400)
    })

    it('should reject non-existent category', async () => {
      await request(app.getHttpServer())
        .post('/api/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Error',
          duration: 30,
          categoryId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400)
    })
  })

  describe('GET /api/services', () => {
    it('should list services with category details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      const svc = res.body.data.find((s: any) => s.id === createdServiceId)
      expect(svc.category.name).toBe('Cortes VIP')
    })
  })

  describe('PATCH /api/services/:id', () => {
    it('should update service details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ duration: 45 })
        .expect(200)

      expect(res.body.data.duration).toBe(45)
    })
  })

  describe('GET /api/services/:id', () => {
    it('should get full service details including category and professionals', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.id).toBe(createdServiceId)
      expect(res.body.data.category).toBeDefined()
      expect(res.body.data.professionals).toBeDefined() // Array of ProfessionalService
    })
  })

  // ── DELETE endpoints (Soft deletes) ────────────────────────────────────────

  describe('DELETE', () => {
    it('should deactivate a service', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.active).toBe(false)
    })

    it('should deactivate a category', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/services/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.active).toBe(false)
    })
  })
})
