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
  jest.setTimeout(120000)
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

  // Usaremos una fecha estática para evitar problemas de zona horaria y día actual en los tests.
  // 2026-06-01 es Lunes.
  const queryDate = '2026-06-01'

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
        endTime: '18:00',
        branchId: branchId,
      })
  })



  beforeEach(async () => {
    // Limpiar solo las excepciones para evitar bloqueos entre tests.
    if (professionalId) {
      await prisma.availabilityException.deleteMany({ where: { professionalId } })
    }
    // Resetear configuración del tenant que se cambia en algunos tests
    if (tenantId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          publicMaxBookingDays: 30,
          publicMinBookingTime: '1h',
          publicMaxOverlapMins: 15,
        }
      })
    }
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

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      expect(slots).toContain('09:00')
      expect(slots).toContain('11:30')
      expect(slots).toContain('17:30')
      expect(slots).not.toContain('17:45') // Doesn't fit a 30m service before 18:00
      // 09:00 to 18:00 step 15m. (18-9)*4 = 36 slots.
      // But last slot is 17:30. So 09:00 to 17:30 is 35 slots? 
      // Wait, 09:00 (1), 09:15 (2), ..., 10:00 (5).
      // (17.5 - 9) / 0.25 + 1 = 8.5 / 0.25 + 1 = 34 + 1 = 35.
      expect(slots.length).toBe(35)
    })

    it('should block all slots if a HOLIDAY exception exists for the day', async () => {
      // Limpiar excepciones previas
      await prisma.availabilityException.deleteMany({ where: { professionalId } })

      // Add a holiday for next Monday
      await request(app.getHttpServer())
        .post(`/api/professionals/${professionalId}/exceptions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'HOLIDAY',
          date: queryDate,
          reason: 'Día libre',
        })

      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      expect(slots).toHaveLength(0) // No slots available

    })

    it('should block slots if the day falls within a date range exception (LEAVE)', async () => {
      // Clear previous exception first (to be clean)
      await prisma.availabilityException.deleteMany({ where: { professionalId } })

      // Create a range exception that covers next Monday
      const start = new Date(queryDate)
      start.setDate(start.getDate() - 2)
      const end = new Date(queryDate)
      end.setDate(end.getDate() + 2)

      await request(app.getHttpServer())
        .post(`/api/professionals/${professionalId}/exceptions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'LEAVE',
          date: start.toISOString(),
          endDate: end.toISOString(),
          reason: 'Vacaciones largas',
        })

      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      expect(slots).toHaveLength(0) // Monday is inside the range

    })

    it('should only block specific time if a partial BLOCK exception exists', async () => {
      // Limpiar excepciones previas
      await prisma.availabilityException.deleteMany({ where: { professionalId } })

      // Block 10:00 to 11:00
      await request(app.getHttpServer())
        .post(`/api/professionals/${professionalId}/exceptions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'BLOCK',
          date: queryDate,
          startTime: '10:00',
          endTime: '11:00',
          reason: 'Pausa almuerzo',
        })

      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      expect(slots).toContain('09:00')
      expect(slots).not.toContain('10:00')
      expect(slots).not.toContain('10:30')
      expect(slots).toContain('11:00')
    })

    it('should ignore appointments from other branches', async () => {
      // Setup a second branch
      const bRes2 = await request(app.getHttpServer())
        .post('/api/tenants/me/branches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sede Appt 2' })
      const branch2Id = bRes2.body.data.id

      // Link Professional to Branch 2
      await request(app.getHttpServer())
        .patch(`/api/professionals/${professionalId}/branches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [branchId, branch2Id] })

      // Set Availability in Branch 2 (same time as Branch 1)
      await request(app.getHttpServer())
        .post(`/api/professionals/${professionalId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '18:00',
          branchId: branch2Id,
        })

      // Book an appointment in Branch 2
      const startTime = new Date(queryDate)
      startTime.setUTCHours(12, 0, 0, 0) // Book 09:00 local (12:00 UTC)
      
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId,
          professionalId,
          serviceId,
          branchId: branch2Id, // DIFFERENT BRANCH
          startTime: startTime.toISOString(),
          notes: 'Test note in another branch',
        })
        .expect(201)

      // Query availability in Branch 1
      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      
      // The user explicitly requested that appointments in one branch shouldn't block another branch.
      // So Branch 1 should STILL have 09:00 available, even if the professional is booked at Branch 2.
      expect(slots).toContain('09:00')
    })

    it('should respect publicMaxBookingDays (e.g., 7 days)', async () => {
      // Set max days to 7
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { publicMaxBookingDays: 7 }
      })

      const farDate = new Date()
      farDate.setDate(farDate.getDate() + 10) // 10 days away
      const farDateStr = farDate.toISOString().split('T')[0]

      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${farDateStr}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data).toHaveLength(0)
    })

    it('should respect publicMinBookingTime (e.g., 2h notice)', async () => {
      // Set min notice to 2h
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { publicMinBookingTime: '2h' }
      })

      // We need to test "today"
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      // Make professional available today
      const dayOfWeekNow = now.getUTCDay()
      await request(app.getHttpServer())
        .post(`/api/professionals/${professionalId}/availability`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dayOfWeek: dayOfWeekNow,
          startTime: '00:00',
          endTime: '23:59',
          branchId: branchId,
        })

      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${today}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      
      // Find a slot that is between now and 2h from now
      const offsetMins = -180;
      const currentMins = (now.getUTCHours() * 60 + now.getUTCMinutes()) + offsetMins
      const tooSoonMins = currentMins + 30 // 30 mins from now
      
      if (tooSoonMins < 1440) { // If it's still today
        const hh = Math.floor(tooSoonMins / 15 * 15 / 60).toString().padStart(2, '0') // Round to step
        const mm = (Math.floor(tooSoonMins / 15) * 15 % 60).toString().padStart(2, '0')
        const tooSoonTime = `${hh}:${mm}`

        const slot = slotsObj.find(s => s.time === tooSoonTime)
        if (slot) {
          expect(slot.available).toBe(false) // Should be false because of 2h notice
        }
      }
    })
  })

  // ── Appointments Tests ─────────────────────────────────────────────────────

  describe('Appointments Booking', () => {
    it('should book an appointment', async () => {
      const startTime = new Date(queryDate)
      startTime.setUTCHours(16, 0, 0, 0) // Book 13:00 local (16:00 UTC)

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

    it('should ignore appointments from Branch 2 when querying Branch 1', async () => {
      const startTime = new Date(queryDate)
      startTime.setUTCHours(14, 0, 0, 0) // 11:00 local (different time to avoid conflicts)
      
      const branches = await prisma.branch.findMany({ where: { tenantId } })
      const branch2 = branches.find(b => b.name === 'Sede Appt 2')
      
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId,
          professionalId,
          serviceId,
          branchId: branch2?.id,
          startTime: startTime.toISOString(),
        })

      const res = await request(app.getHttpServer())
        .get(`/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      
      // Branch 1 should STILL have 11:00 available
      expect(slots).toContain('11:00')
    })

    it('should reflect the booking in the availability engine (slot removed)', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      // 13:00 to 13:30 is occupied.
      expect(slots).not.toContain('13:00')
      expect(slots).toContain('13:15') // Available because of 15m overlap!
      expect(slots).toContain('13:30') // Free to start right after
    })

    it('should allow 09:00 (60min) if 09:45 is booked and overlap is 15min', async () => {
      // 1. Book at 09:45
      const startTime45 = new Date(queryDate)
      startTime45.setUTCHours(12, 45, 0, 0) // 09:45 local
      
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId,
          professionalId,
          serviceId,
          branchId,
          startTime: startTime45.toISOString(),
        })

      // 2. Query 09:00 with duration 60
      const res = await request(app.getHttpServer())
        .get(`/api/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${queryDate}&duration=60`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      
      // 09:00 to 10:00 (60min)
      // Overlaps with 09:45 - 10:15 by 15 minutes.
      // Since allowedOverlap = 15, it should be AVAILABLE.
      expect(slots).toContain('09:00')
    })


    it('should fetch appointments and logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.length).toBe(4) // Since we added another one at 09:45
      const appt = res.body.data.find((a: any) => a.id === appointmentId)
      expect(appt).toBeDefined()
      expect(appt.id).toBe(appointmentId)

      // Verify the log was created in DB directly since we didn't expose a /logs route
      const logs = await prisma.appointmentLog.findMany({ where: { appointmentId } })
      expect(logs.length).toBe(1)
      expect(logs[0].newStatus).toBe('PENDING')
      expect(logs[0].changedBy).toBe(adminUserId)
    })

    it('should fetch a single appointment by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.id).toBe(appointmentId)
      expect(res.body.data.client.id).toBe(clientId)
      expect(res.body.data.branch.id).toBe(branchId)
    })

    it('should fetch appointments filtering by date-only strings (YYYY-MM-DD)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/appointments?startDate=${queryDate}&endDate=${queryDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.length).toBeGreaterThan(0)
    })
  })

  // ── Status Changes ─────────────────────────────────────────────────────────

  describe('Status changes & Audit Trail', () => {
    it('should update appointment details including status and internalNotes', async () => {
      const startTime = new Date(queryDate)
      startTime.setUTCHours(10, 0, 0, 0)
      
      const apptRes = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId,
          professionalId,
          serviceId,
          branchId,
          startTime: startTime.toISOString(),
        })
      const tempId = apptRes.body.data.id

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/appointments/${tempId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientId,
          professionalId,
          serviceId,
          branchId,
          startTime: startTime.toISOString(),
          status: 'CONFIRMED',
          internalNotes: 'VIP Customer'
        })
        .expect(200)

      expect(updateRes.body.data.status).toBe('CONFIRMED')
      expect(updateRes.body.data.internalNotes).toBe('VIP Customer')
    })

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

      const slotsObj = res.body.data as { time: string; available: boolean }[]
      const slots = slotsObj.filter(s => s.available).map(s => s.time)
      expect(slots).toContain('09:00') // Slot is back!
    })
  })

  describe('Cancellation Limit Validation', () => {
    let testToken: string;
    let nearApptId: string;
    let farApptId: string;
    let farToken: string;

    beforeAll(async () => {
      // 1. Create a near appointment (e.g. 2 hours from now)
      const nearTime = new Date();
      nearTime.setHours(nearTime.getHours() + 2);
      
      const appt1 = await prisma.appointment.create({
        data: {
          tenantId,
          clientId,
          professionalId,
          serviceId,
          branchId,
          startTime: nearTime,
          endTime: new Date(nearTime.getTime() + 30 * 60000),
          status: 'PENDING',
          cancelToken: `near-token-${Date.now()}`
        }
      });
      testToken = appt1.cancelToken!;
      nearApptId = appt1.id;

      // 2. Create a far appointment (e.g. 30 hours from now)
      const farTime = new Date();
      farTime.setHours(farTime.getHours() + 30);
      
      const appt2 = await prisma.appointment.create({
        data: {
          tenantId,
          clientId,
          professionalId,
          serviceId,
          branchId,
          startTime: farTime,
          endTime: new Date(farTime.getTime() + 30 * 60000),
          status: 'PENDING',
          cancelToken: `far-token-${Date.now()}`
        }
      });
      farToken = appt2.cancelToken!;
      farApptId = appt2.id;
    });

    afterAll(async () => {
      await prisma.appointment.deleteMany({
        where: { id: { in: [nearApptId, farApptId] } }
      });
    });

    it('should reject cancellation if time is within limit (e.g. limit 24h, appt in 2h)', async () => {
      // Set limit to 24h
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { cancellationLimit: '24h' }
      });

      // Try to cancel near appointment via token
      await request(app.getHttpServer())
        .post(`/api/public/appointments/${testToken}/cancel`)
        .expect(400); // Bad Request because limit of 24h has passed
    });

    it('should reject rescheduling if time is within limit (e.g. limit 24h, appt in 2h)', async () => {
      // Set limit to 24h
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { cancellationLimit: '24h' }
      });

      const newTime = new Date();
      newTime.setDate(newTime.getDate() + 2); // 2 days in the future

      // Try to reschedule near appointment
      await request(app.getHttpServer())
        .post(`/api/public/appointments/${testToken}/reschedule`)
        .send({ startTime: newTime.toISOString() })
        .expect(400); // Bad Request because cancellation limit is enforced on reschedule too
    });

    it('should allow cancellation if time is outside limit (e.g. limit 24h, appt in 30h)', async () => {
      await request(app.getHttpServer())
        .post(`/api/public/appointments/${farToken}/cancel`)
        .expect(200); // Allowed

      const appt = await prisma.appointment.findUnique({ where: { id: farApptId } });
      expect(appt?.status).toBe('CANCELLED');
    });

    it('should reject cancel/reschedule completely if limit is never', async () => {
      // Set limit to never
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { cancellationLimit: 'never' }
      });

      // Try to cancel near appointment
      await request(app.getHttpServer())
        .post(`/api/public/appointments/${testToken}/cancel`)
        .expect(403); // Forbidden
    });
  });

  describe('Private Booking Invitations Availability & Flow', () => {
    let invitationToken: string;
    let tenantSlug: string;
    let createdApptId: string | null = null;

    beforeAll(async () => {
      // Get the actual publicSlug from the DB
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });
      tenantSlug = tenant!.publicSlug;
      if (!tenantSlug) {
        tenantSlug = `pub-slug-${Date.now()}`;
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { publicSlug: tenantSlug }
        });
      }

      // Create a private booking invitation
      // Monday is 1, let's allow Monday (which queryDate '2026-06-01' is a Monday)
      const inv = await prisma.bookingInvitation.create({
        data: {
          tenantId,
          token: 'inv_test_token_123',
          startDate: new Date('2026-06-01T00:00:00Z'),
          endDate: new Date('2026-06-02T00:00:00Z'),
          schedule: [
            { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }
          ]
        }
      });
      invitationToken = inv.token;
    });

    afterAll(async () => {
      await prisma.bookingInvitation.deleteMany({
        where: { token: 'inv_test_token_123' }
      });
    });

    it('should filter availability by invitation schedule and dates', async () => {
      // Query availability with the invitation token on the correct date (Monday 2026-06-01)
      const res = await request(app.getHttpServer())
        .get(
          `/api/p/${tenantSlug}/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=2026-06-01&invitationToken=${invitationToken}`,
        )
        .expect(200);

      const slots = res.body.data as { time: string; available: boolean }[];
      const activeTimes = slots.filter(s => s.available).map(s => s.time);

      // Should only return slots between 10:00 and 11:30 (since service duration is 30m, and schedule is 10:00 - 12:00)
      expect(activeTimes).toContain('10:00');
      expect(activeTimes).toContain('11:00');
      expect(activeTimes).toContain('11:30');
      expect(activeTimes).not.toContain('09:00');
      expect(activeTimes).not.toContain('12:00');
    });

    it('should return empty slots if querying date before invitation startDate', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/p/${tenantSlug}/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=2026-05-31&invitationToken=${invitationToken}`,
        )
        .expect(200);

      const slots = res.body.data as { time: string; available: boolean }[];
      const activeTimes = slots.filter(s => s.available).map(s => s.time);
      expect(activeTimes.length).toBe(0);
    });

    it('should return empty slots if querying date after invitation endDate', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/p/${tenantSlug}/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=2026-06-03&invitationToken=${invitationToken}`,
        )
        .expect(200);

      const slots = res.body.data as { time: string; available: boolean }[];
      const activeTimes = slots.filter(s => s.available).map(s => s.time);
      expect(activeTimes.length).toBe(0);
    });

    it('should allow booking with valid invitation even if publicActive is false', async () => {
      // Temporarily disable tenant bookings globally
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { publicActive: false }
      });

      try {
        // Querying availability without invitation should throw NotFoundException
        await request(app.getHttpServer())
          .get(
            `/api/p/${tenantSlug}/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=2026-06-01`,
          )
          .expect(404);

        // Querying availability WITH invitation should succeed
        const res = await request(app.getHttpServer())
          .get(
            `/api/p/${tenantSlug}/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=2026-06-01&invitationToken=${invitationToken}`,
          )
          .expect(200);

        const slots = res.body.data as { time: string; available: boolean }[];
        const activeTimes = slots.filter(s => s.available).map(s => s.time);
        expect(activeTimes).toContain('10:00');

        // Booking without invitation should throw NotFoundException
        const startTime = new Date('2026-06-01T13:00:00Z');
        await request(app.getHttpServer())
          .post(`/api/p/${tenantSlug}/appointments/book`)
          .send({
            professionalId,
            serviceId,
            branchId,
            startTime: startTime.toISOString(),
            clientName: 'Invitado Test',
            clientEmail: 'invitado@test.com',
            clientPhone: '+5491122334455'
          })
          .expect(404);

        // Booking WITH invitation should succeed and increment usesCount
        const bookRes = await request(app.getHttpServer())
          .post(`/api/p/${tenantSlug}/appointments/book`)
          .send({
            professionalId,
            serviceId,
            branchId,
            startTime: startTime.toISOString(),
            clientName: 'Invitado Test',
            clientEmail: 'invitado@test.com',
            clientPhone: '+5491122334455',
            invitationToken
          })
          .expect(201);

        createdApptId = bookRes.body.data.id;

        const updatedInv = await prisma.bookingInvitation.findUnique({
          where: { token: invitationToken }
        });
        expect(updatedInv?.usesCount).toBe(1);

      } finally {
        // Restore tenant
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { publicActive: true }
        });
        // Clean up created appointment
        if (createdApptId) {
          await prisma.appointment.delete({
            where: { id: createdApptId }
          }).catch(() => null);
        }
        // Clean up created client
        await prisma.client.deleteMany({
          where: { email: 'invitado@test.com' }
        }).catch(() => null);
      }
    });

    it('should only allow rescheduling within invitation constraints if generated from an invitation', async () => {
      // Reset cancellationLimit to '24h' to avoid 'never' from previous test
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { cancellationLimit: '24h' }
      });

      // Calculate next Monday in the future
      const futureMonday = new Date();
      futureMonday.setDate(futureMonday.getDate() + ((1 + 7 - futureMonday.getDay()) % 7 || 7));
      
      const invStartDate = new Date(futureMonday);
      invStartDate.setUTCHours(0, 0, 0, 0);

      const invEndDate = new Date(futureMonday);
      invEndDate.setDate(invEndDate.getDate() + 1);
      invEndDate.setUTCHours(0, 0, 0, 0);

      const dateStr = invStartDate.toISOString().split('T')[0];

      const startTime = new Date(invStartDate);
      startTime.setUTCHours(13, 0, 0, 0); // 10:00 local (Argentina offset is -3h => 13:00 UTC)

      // Create an invitation for a future Monday
      const testInvitation = await prisma.bookingInvitation.create({
        data: {
          tenantId,
          token: 'inv_resched_test_token',
          startDate: invStartDate,
          endDate: invEndDate,
          schedule: [
            { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }
          ]
        }
      });

      const cancelToken = `inv-cancel-${Date.now()}`;
      
      const appt = await prisma.appointment.create({
        data: {
          tenantId,
          clientId,
          professionalId,
          serviceId,
          branchId,
          startTime: startTime,
          endTime: new Date(startTime.getTime() + 30 * 60000),
          status: 'PENDING',
          cancelToken,
          invitationId: testInvitation.id
        }
      });

      try {
        const availRes = await request(app.getHttpServer())
          .get(`/api/p/${tenantSlug}/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${dateStr}&excludeAppointmentId=${appt.id}`)
          .expect(200);

        const slots = availRes.body.data as { time: string; available: boolean }[];
        const activeTimes = slots.filter(s => s.available).map(s => s.time);
        
        expect(activeTimes).toContain('10:00');
        expect(activeTimes).not.toContain('09:00');

        const badTime = new Date(invStartDate);
        badTime.setUTCHours(12, 0, 0, 0); // 09:00 local
        await request(app.getHttpServer())
          .post(`/api/public/appointments/${cancelToken}/reschedule`)
          .send({ startTime: badTime.toISOString() })
          .expect(400);

        const goodTime = new Date(invStartDate);
        goodTime.setUTCHours(14, 0, 0, 0); // 11:00 local
        const res = await request(app.getHttpServer())
          .post(`/api/public/appointments/${cancelToken}/reschedule`)
          .send({ startTime: goodTime.toISOString() });
        expect(res.status).toBe(200);

        const updatedAppt = await prisma.appointment.findUnique({ where: { id: appt.id } });
        expect(new Date(updatedAppt!.startTime).toISOString()).toBe(goodTime.toISOString());

      } finally {
        await prisma.appointment.delete({ where: { id: appt.id } }).catch(() => null);
        await prisma.bookingInvitation.delete({ where: { id: testInvitation.id } }).catch(() => null);
      }
    });

    it('should allow rescheduling an invitation-based appointment even if invitation has maxUses=1 and is fully used', async () => {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { cancellationLimit: '24h' }
      });

      // Calculate next Monday in the future
      const futureMonday = new Date();
      futureMonday.setDate(futureMonday.getDate() + ((1 + 7 - futureMonday.getDay()) % 7 || 7));
      
      const invStartDate = new Date(futureMonday);
      invStartDate.setUTCHours(0, 0, 0, 0);

      const invEndDate = new Date(futureMonday);
      invEndDate.setDate(invEndDate.getDate() + 1);
      invEndDate.setUTCHours(0, 0, 0, 0);

      const dateStr = invStartDate.toISOString().split('T')[0];

      const startTime = new Date(invStartDate);
      startTime.setUTCHours(13, 0, 0, 0); // 10:00 local (Argentina offset is -3h => 13:00 UTC)

      const testInvitation = await prisma.bookingInvitation.create({
        data: {
          tenantId,
          token: 'inv_max_uses_resched_test',
          startDate: invStartDate,
          endDate: invEndDate,
          maxUses: 1,
          usesCount: 1,
          schedule: [
            { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }
          ]
        }
      });

      const cancelToken = `inv-cancel-max-${Date.now()}`;
      
      const appt = await prisma.appointment.create({
        data: {
          tenantId,
          clientId,
          professionalId,
          serviceId,
          branchId,
          startTime: startTime,
          endTime: new Date(startTime.getTime() + 30 * 60000),
          status: 'PENDING',
          cancelToken,
          invitationId: testInvitation.id
        }
      });

      try {
        const availRes = await request(app.getHttpServer())
          .get(`/api/p/${tenantSlug}/appointments/availability?professionalId=${professionalId}&serviceId=${serviceId}&branchId=${branchId}&date=${dateStr}&excludeAppointmentId=${appt.id}&invitationToken=${testInvitation.token}`)
          .expect(200);

        const slots = availRes.body.data as { time: string; available: boolean }[];
        const activeTimes = slots.filter(s => s.available).map(s => s.time);
        expect(activeTimes).toContain('10:00');

        const goodTime = new Date(invStartDate);
        goodTime.setUTCHours(14, 0, 0, 0); // 11:00 local
        await request(app.getHttpServer())
          .post(`/api/public/appointments/${cancelToken}/reschedule`)
          .send({ startTime: goodTime.toISOString() })
          .expect(200);

        const updatedAppt = await prisma.appointment.findUnique({ where: { id: appt.id } });
        expect(new Date(updatedAppt!.startTime).toISOString()).toBe(goodTime.toISOString());

      } finally {
        await prisma.appointment.delete({ where: { id: appt.id } }).catch(() => null);
        await prisma.bookingInvitation.delete({ where: { id: testInvitation.id } }).catch(() => null);
      }
    });
  });
})
