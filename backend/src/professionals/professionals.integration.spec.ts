/**
 * Professionals Integration Tests
 *
 * Tests the full CRUD flow for /professionals against a real DB.
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

const slug = `prof-test-${Date.now()}`
const adminOrg = {
  organizationName: 'Prof Test Org',
  organizationSlug: slug,
  firstName: 'Admin',
  lastName: 'Test',
  email: `admin-prof-${Date.now()}@test.axenda.com`,
  password: 'AdminPass123!',
}

const newProfessional = {
  firstName: 'Maria',
  lastName: 'Gomez',
  bio: 'Expert colorist',
  color: '#4CAF50',
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Professionals — Integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let adminToken: string
  let createdProfId: string
  let createdBranchId: string
  let createdAvailabilityId: string
  let createdExceptionId: string

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
    const payload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64url').toString())
    tenantId = payload['tenantId'] as string

    // Create a branch for testing relations
    const branchRes = await request(app.getHttpServer())
      .post('/api/tenants/me/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sede Central' })
    createdBranchId = branchRes.body.data.id
  })

  // ── Teardown ───────────────────────────────────────────────────────────────

  afterAll(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => null)
    }
    await app.close()
  })

  // ── POST /api/professionals ────────────────────────────────────────────────

  describe('POST /api/professionals', () => {
    it('should create a new professional (ADMIN)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/professionals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProfessional)
        .expect(201)

      expect(res.body.data).toMatchObject({
        firstName: newProfessional.firstName,
        lastName: newProfessional.lastName,
        tenantId,
        active: true,
      })
      createdProfId = res.body.data.id
    })

    it('should reject invalid color format with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/professionals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...newProfessional, color: 'blue' }) // Not HEX
        .expect(400)
    })
  })

  // ── GET /api/professionals ─────────────────────────────────────────────────

  describe('GET /api/professionals', () => {
    it('should list professionals', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/professionals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data[0].branches).toBeDefined()
    })
  })

  // ── GET /api/professionals/search ──────────────────────────────────────────

  describe('GET /api/professionals/search', () => {
    it('should search professionals by query string', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/professionals/search')
        .query({ q: 'Maria' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0].firstName).toBe('Maria')
    })

    it('should return empty list if no results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/professionals/search')
        .query({ q: 'NonExistentProfessional' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data).toHaveLength(0)
    })
  })

  // ── PATCH /api/professionals/:id ───────────────────────────────────────────

  describe('PATCH /api/professionals/:id', () => {
    it('should update professional details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/professionals/${createdProfId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ bio: 'Updated bio' })
        .expect(200)

      expect(res.body.data.bio).toBe('Updated bio')
    })
  })

  // ── PATCH /api/professionals/:id/branches ──────────────────────────────────

  describe('PATCH /api/professionals/:id/branches', () => {
    it('should assign a branch to the professional', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/professionals/${createdProfId}/branches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [createdBranchId] })
        .expect(200)

      expect(res.body.data.branches).toHaveLength(1)
      expect(res.body.data.branches[0].branchId).toBe(createdBranchId)
    })

    it('should reject assigning non-existent branches', async () => {
      await request(app.getHttpServer())
        .patch(`/api/professionals/${createdProfId}/branches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: ['00000000-0000-0000-0000-000000000000'] })
        .expect(400)
    })
  })

  // ── POST /api/professionals/:id/availability ───────────────────────────────

  describe('POST /api/professionals/:id/availability', () => {
    it('should add a weekly schedule block', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/professionals/${createdProfId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dayOfWeek: 1, // Lunes
          startTime: '09:00',
          endTime: '13:00',
          branchId: createdBranchId,
        })
        .expect(201)

      expect(res.body.data).toMatchObject({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '13:00',
        professionalId: createdProfId,
      })
      createdAvailabilityId = res.body.data.id
    })

    it('should reject invalid time format', async () => {
      await request(app.getHttpServer())
        .post(`/api/professionals/${createdProfId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ dayOfWeek: 2, startTime: '9:00', endTime: '18:00' }) // Missing leading zero
        .expect(400)
    })

    it('should reject startTime >= endTime', async () => {
      await request(app.getHttpServer())
        .post(`/api/professionals/${createdProfId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ dayOfWeek: 2, startTime: '18:00', endTime: '09:00' })
      expect(400)
    })
  })

  // ── POST /api/professionals/:id/exceptions ─────────────────────────────────

  describe('POST /api/professionals/:id/exceptions', () => {
    it('should add an exception (holiday day)', async () => {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const res = await request(app.getHttpServer())
        .post(`/api/professionals/${createdProfId}/exceptions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'HOLIDAY',
          date: nextWeek.toISOString(),
          reason: 'Vacaciones',
        })
        .expect(201)

      expect(res.body.data.type).toBe('HOLIDAY')
      createdExceptionId = res.body.data.id
    })

    it('should add a partial day block (BLOCK type)', async () => {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 8)

      await request(app.getHttpServer())
        .post(`/api/professionals/${createdProfId}/exceptions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'BLOCK',
          date: nextWeek.toISOString(),
          startTime: '14:00',
          endTime: '16:00',
          reason: 'Turno médico personal',
        })
        .expect(201)
    })

    it('should add a date range exception', async () => {
      const start = new Date()
      start.setDate(start.getDate() + 20)
      const end = new Date()
      end.setDate(end.getDate() + 25)

      const res = await request(app.getHttpServer())
        .post(`/api/professionals/${createdProfId}/exceptions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'LEAVE',
          date: start.toISOString(),
          endDate: end.toISOString(),
          reason: 'Licencia por viaje',
        })
        .expect(201)
      
      expect(res.body.data.endDate).toBeDefined()
    })
  })

  // ── GET /api/professionals/:id ─────────────────────────────────────────────

  describe('GET /api/professionals/:id', () => {
    it('should get full professional details including relations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/professionals/${createdProfId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.id).toBe(createdProfId)
      expect(res.body.data.branches).toHaveLength(1)
      expect(res.body.data.availability).toHaveLength(1)
      expect(res.body.data.exceptions.length).toBeGreaterThanOrEqual(3)
    })
  })

  // ── DELETE endpoints ───────────────────────────────────────────────────────

  describe('DELETE schedules and professional', () => {
    it('should remove an availability block', async () => {
      await request(app.getHttpServer())
        .delete(`/api/professionals/${createdProfId}/availability/${createdAvailabilityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('should remove an exception block', async () => {
      await request(app.getHttpServer())
        .delete(`/api/professionals/${createdProfId}/exceptions/${createdExceptionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('should physically delete the professional', async () => {
      await request(app.getHttpServer())
        .delete(`/api/professionals/${createdProfId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/professionals/${createdProfId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })
  })
})
