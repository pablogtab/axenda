/**
 * Appointments Integration Tests
 *
 * Tests the availability engine and booking flow.
 * Creates an entire mock ecosystem: Branch, Professional, Service, Client.
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

const slug = `appointments-test-${Date.now()}`
const adminOrg = {
  organizationName: 'Appt Test Org',
  organizationSlug: slug,
  firstName: 'Admin',
  lastName: 'Test',
  email: `admin-appt-${Date.now()}@test.axenda.com`,
  password: 'AdminPass123!',
}

describe('Appointments — Integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let adminToken: string
  let adminUserId: string

  let branchId: string
  let professionalId: string
  let serviceId: string
  let clientId: string

  let appointmentId: string

  // We'll test availability for next Monday
  const nextMonday = new Date()
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7)) // Find next Monday
  nextMonday.setUTCHours(0, 0, 0, 0)
  const queryDate = nextMonday.toISOString().split('T')[0] // YYYY-MM-DD

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
    const res = await request(app.getHttpServer()).post('/api/auth/register').send(adminOrg)
    adminToken = res.body.data.accessToken
    const payload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64url').toString())
    tenantId = payload['tenantId'] as string
    adminUserId = payload['sub'] as string

    // Create Ecosystem
    const bRes = await request(app.getHttpServer())
      .post('/api/tenants/me/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sede Appt' })
    branchId = bRes.body.data.id

    const pRes = await request(app.getHttpServer())
      .post('/api/professionals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Dr.', lastName: 'A', color: '#000000' })
    professionalId = pRes.body.data.id

    const sRes = await request(app.getHttpServer())
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Consulta', duration: 30 })
    serviceId = sRes.body.data.id

    const cRes = await request(app.getHttpServer())
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Cliente', lastName: 'X' })
    clientId = cRes.body.data.id

    // Link Branch and Service to Professional
    await request(app.getHttpServer())
      .patch(`/api/professionals/${professionalId}/branches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [branchId] })

    await request(app.getHttpServer())
      .patch(`/api/professionals/${professionalId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [serviceId] })

    // Set Availability for Monday (09:00 to 12:00) => 180 mins total
    // 30 min service = 6 possible slots (09:00, 09:15, ..., 11:30)
    await request(app.getHttpServer())
      .post(`/api/professionals/${professionalId}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '12:00',
        branchId: branchId,
      })
  })

  // ── Teardown ───────────────────────────────────────────────────────────────

  afterAll(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => null)
    }
    await app.close()
  })

  // ── Engine Tests ───────────────────────────────────────────────────────────

  describe('Availability Engine', () => {
    it('should return all possible free slots on a clear day', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slots = res.body.data as string[]
      expect(slots).toContain('09:00')
      expect(slots).toContain('11:30')
      expect(slots).not.toContain('12:00') // Doesn't fit a 30m service before 12:00
      // 09:00 to 12:00 step 15m => 09:00, 09:15, 09:30, 09:45, 10:00, 10:15, 10:30, 10:45, 11:00, 11:15, 11:30 (11 slots)
      expect(slots.length).toBe(11)
    })
  })

  // ── Appointments Tests ─────────────────────────────────────────────────────

  describe('Appointments Booking', () => {
    it('should book an appointment', async () => {
      const startTime = new Date(nextMonday)
      startTime.setUTCHours(9, 0, 0, 0) // Book 09:00 to 09:30

      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId,
          professionalId,
          serviceId,
          branchId,
          startTime: startTime.toISOString(),
          notes: 'Test note',
        })
        .expect(201)

      appointmentId = res.body.data.id
      expect(res.body.data.status).toBe('PENDING')
      expect(res.body.data.clientId).toBe(clientId)
    })

    it('should reflect the booking in the availability engine (slot removed)', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slots = res.body.data as string[]
      // 09:00 to 09:30 is occupied.
      // So 09:00 cannot start.
      // 08:45 (if existed) couldn't finish.
      // 09:15 starts inside the booking, conflict!
      expect(slots).not.toContain('09:00')
      expect(slots).not.toContain('09:15')
      expect(slots).toContain('09:30') // Free to start right after
    })

    it('should fetch appointments and logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0].id).toBe(appointmentId)

      // Verify the log was created in DB directly since we didn't expose a /logs route
      const logs = await prisma.appointmentLog.findMany({ where: { appointmentId } })
      expect(logs.length).toBe(1)
      expect(logs[0].newStatus).toBe('PENDING')
      expect(logs[0].changedBy).toBe(adminUserId)
    })
  })

  // ── Status Changes ─────────────────────────────────────────────────────────

  describe('Status changes & Audit Trail', () => {
    it('should change status to CONFIRMED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200)

      expect(res.body.data.status).toBe('CONFIRMED')
    })

    it('should cancel the appointment', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.status).toBe('CANCELLED')
    })

    it('cancelled slots should free up the availability engine', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slots = res.body.data as string[]
      expect(slots).toContain('09:00') // Slot is back!
    })
  })
})
