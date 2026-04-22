/**
 * Users & Tenants Integration Tests
 *
 * Tests the full CRUD flow for /users and /tenants/me against a real DB.
 * Setup: registers an org (ADMIN) + creates a secondary user for role tests.
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodePayload(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
}

// ─── Test Data ────────────────────────────────────────────────────────────────

const slug = `users-test-${Date.now()}`
const adminOrg = {
  organizationName: 'Users Test Org',
  organizationSlug: slug,
  firstName: 'Admin',
  lastName: 'Test',
  email: `admin-${Date.now()}@test.axenda.com`,
  password: 'AdminPass123!',
}

const newUser = {
  firstName: 'Receptionist',
  lastName: 'Test',
  email: `receptionist-${Date.now()}@test.axenda.com`,
  password: 'UserPass123!',
  role: 'RECEPTIONIST',
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Users & Tenants — Integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let adminToken: string
  let adminUserId: string
  let createdUserId: string
  let createdBranchId: string

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

    // Register org and get token
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(adminOrg)

    adminToken = res.body.data.accessToken
    const payload = decodePayload(adminToken)
    tenantId = payload['tenantId'] as string
    adminUserId = payload['sub'] as string
  })

  // ── Teardown ───────────────────────────────────────────────────────────────

  afterAll(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => null)
    }
    await app.close()
  })

  // ── GET /api/users/me ──────────────────────────────────────────────────────

  describe('GET /api/users/me', () => {
    it('should return the authenticated user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data).toMatchObject({
        id: adminUserId,
        email: adminOrg.email,
        role: 'ADMIN',
      })
      expect(res.body.data).not.toHaveProperty('passwordHash')
    })

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/users/me').expect(401)
    })
  })

  // ── PATCH /api/users/me ────────────────────────────────────────────────────

  describe('PATCH /api/users/me', () => {
    it('should update own first name', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'AdminUpdated' })
        .expect(200)

      expect(res.body.data.firstName).toBe('AdminUpdated')
    })
  })

  // ── POST /api/users (create) ───────────────────────────────────────────────

  describe('POST /api/users', () => {
    it('should create a new user (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201)

      expect(res.body.data).toMatchObject({
        email: newUser.email,
        role: 'RECEPTIONIST',
        active: true,
      })
      expect(res.body.data).not.toHaveProperty('passwordHash')
      createdUserId = res.body.data.id
    })

    it('should reject duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(409)
    })

    it('should reject short password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...newUser, email: 'other@test.com', password: '123' })
        .expect(400)
    })
  })

  // ── GET /api/users ─────────────────────────────────────────────────────────

  describe('GET /api/users', () => {
    it('should list tenant users (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2) // admin + created user
      expect(res.body.data.every((u: { passwordHash?: unknown }) => !u.passwordHash)).toBe(true)
    })
  })

  // ── GET /api/users/:id ─────────────────────────────────────────────────────

  describe('GET /api/users/:id', () => {
    it('should get a user by id (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.id).toBe(createdUserId)
    })

    it('should return 404 for unknown user', async () => {
      await request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })
  })

  // ── PATCH /api/users/:id ───────────────────────────────────────────────────

  describe('PATCH /api/users/:id', () => {
    it('should update a user (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'ReceptionistUpdated' })
        .expect(200)

      expect(res.body.data.firstName).toBe('ReceptionistUpdated')
    })
  })

  // ── PATCH /api/users/:id/role ──────────────────────────────────────────────

  describe('PATCH /api/users/:id/role', () => {
    it('should change user role (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${createdUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MANAGER' })
        .expect(200)

      expect(res.body.data.role).toBe('MANAGER')
    })

    it('should reject changing own role with 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${adminUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MANAGER' })
        .expect(403)
    })

    it('should reject invalid role value with 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${createdUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'INVALID_ROLE' })
        .expect(400)
    })
  })

  // ── DELETE /api/users/:id ──────────────────────────────────────────────────

  describe('DELETE /api/users/:id', () => {
    it('should deactivate user (soft delete, ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.active).toBe(false)
    })

    it('should reject deactivating own account with 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })
  })

  // ── GET /api/tenants/me ────────────────────────────────────────────────────

  describe('GET /api/tenants/me', () => {
    it('should return the tenant profile with counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tenants/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data).toMatchObject({
        id: tenantId,
        slug,
        name: adminOrg.organizationName,
      })
      expect(res.body.data._count).toHaveProperty('users')
      expect(res.body.data._count).toHaveProperty('branches')
    })

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/tenants/me').expect(401)
    })
  })

  // ── PATCH /api/tenants/me ──────────────────────────────────────────────────

  describe('PATCH /api/tenants/me', () => {
    it('should update tenant name (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/tenants/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Org Name', currency: 'USD' })
        .expect(200)

      expect(res.body.data.name).toBe('Updated Org Name')
      expect(res.body.data.currency).toBe('USD')
    })

    it('should reject invalid timezone with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/tenants/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ timezone: 'Not/ATimezone' })
        .expect(400)
    })
  })

  // ── Branches CRUD ──────────────────────────────────────────────────────────

  describe('POST /api/tenants/me/branches', () => {
    it('should create a branch (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tenants/me/branches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sucursal Centro', address: 'Av. Corrientes 1234' })
        .expect(201)

      expect(res.body.data).toMatchObject({
        name: 'Sucursal Centro',
        tenantId,
        active: true,
      })
      createdBranchId = res.body.data.id
    })

    it('should reject missing name with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/tenants/me/branches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ address: 'Sin nombre' })
        .expect(400)
    })
  })

  describe('GET /api/tenants/me/branches', () => {
    it('should list branches (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tenants/me/branches')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.some((b: { id: string }) => b.id === createdBranchId)).toBe(true)
    })
  })

  describe('PATCH /api/tenants/me/branches/:id', () => {
    it('should update a branch (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tenants/me/branches/${createdBranchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sucursal Norte', phone: '+54 11 9999-0000' })
        .expect(200)

      expect(res.body.data.name).toBe('Sucursal Norte')
      expect(res.body.data.phone).toBe('+54 11 9999-0000')
    })

    it('should return 404 for unknown branch', async () => {
      await request(app.getHttpServer())
        .patch('/api/tenants/me/branches/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost' })
        .expect(404)
    })
  })

  describe('DELETE /api/tenants/me/branches/:id', () => {
    it('should deactivate branch (soft delete, ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/tenants/me/branches/${createdBranchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.active).toBe(false)
    })
  })
})
