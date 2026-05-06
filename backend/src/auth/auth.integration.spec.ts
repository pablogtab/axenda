/**
 * Auth Integration Tests
 *
 * Tests the full auth flow against a real PostgreSQL database:
 * register → login → refresh (token rotation) → logout
 *
 * Cleanup: all created data is removed in afterAll.
 */
import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env BEFORE any NestJS module is imported so ConfigModule picks it up
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

// ─── Test Data ───────────────────────────────────────────────────────────────

const slug = `test-org-${Date.now()}`
const testOrg = {
  organizationName: 'Test Organization',
  firstName: 'Test',
  lastName: 'Admin',
  email: `admin-${Date.now()}@test.axenda.com`,
  password: 'TestPass123!',
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Auth — Integration', () => {
  let app: INestApplication
  let prisma: PrismaService
  let tenantId: string
  let accessToken: string
  let refreshToken: string

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
  })

  // ── Teardown ───────────────────────────────────────────────────────────────

  afterAll(async () => {
    // Delete the tenant created during this test run (cascades to users + tokens)
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => null)
    }

    // Also clean up the tenant created during manual curl testing
    await prisma.tenant
      .delete({ where: { slug: 'axenda-demo' } })
      .catch(() => null)

    await app.close()
  })

  // ── POST /api/auth/register-flow ──────────────────────────────────────────

  describe('Registration Flow (Start & Complete)', () => {
    it('should start registration and send a code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register-start')
        .send({
          organizationName: testOrg.organizationName,
          email: testOrg.email,
          turnstileToken: 'test-token',
        })
        .expect(201)

      expect(res.body.data.message).toContain('enviado')

      // Verificar que el código existe en la DB
      const verification = await prisma.verificationCode.findUnique({
        where: { email: testOrg.email },
      })
      expect(verification).not.toBeNull()
      expect(verification!.code).toHaveLength(6)
    })


    it('should complete registration with correct code', async () => {
      // 1. Obtener el código de la DB
      const verification = await prisma.verificationCode.findUnique({
        where: { email: testOrg.email },
      })
      const code = verification!.code

      // 2. Completar registro
      const res = await request(app.getHttpServer())
        .post('/api/auth/register-complete')
        .send({
          email: testOrg.email,
          code,
          firstName: testOrg.firstName,
          lastName: testOrg.lastName,
          password: testOrg.password,
        })
        .expect(201)

      expect(res.body.data.accessToken).toBeDefined()
      expect(res.body.data.refreshToken).toBeDefined()

      accessToken = res.body.data.accessToken
      refreshToken = res.body.data.refreshToken

      const payload = decodePayload(accessToken)
      tenantId = payload['tenantId'] as string
    })

    it('should reject register-start with already registered email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register-start')
        .send({
          organizationName: 'Another Org',
          email: testOrg.email, // Ya registrado en el test anterior
          turnstileToken: 'test-token',
        })
        .expect(409)
    })

    it('should reject complete-registration with wrong code', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register-complete')
        .send({
          email: testOrg.email,
          code: '000000', // Código incorrecto
          firstName: testOrg.firstName,
          lastName: testOrg.lastName,
          password: testOrg.password,
        })
        .expect(401)
    })
  })

  // ── POST /api/auth/login ───────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials and return token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testOrg.email, password: testOrg.password, turnstileToken: 'test-token' })
        .expect(200)

      expect(res.body.data.accessToken).toBeDefined()
      expect(res.body.data.refreshToken).toBeDefined()

      // Use fresh tokens for subsequent tests
      refreshToken = res.body.data.refreshToken
      accessToken = res.body.data.accessToken
    })

    it('should reject wrong password with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testOrg.email, password: 'WrongPassword!', turnstileToken: 'test-token' })
        .expect(401)

      expect(res.body.statusCode).toBe(401)
    })

    it('should reject non-existent email with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'Password123!', turnstileToken: 'test-token' })
        .expect(401)
    })

    it('should login with email and password and return 200', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testOrg.email, password: testOrg.password, turnstileToken: 'test-token' })
        .expect(200)

      expect(res.body.data.accessToken).toBeDefined()
      refreshToken = res.body.data.refreshToken
    })

    it('should reject login with wrong tenantSlug with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testOrg.email, password: testOrg.password, tenantSlug: 'does-not-exist', turnstileToken: 'test-token' })
        .expect(401)
    })
  })

  // ── POST /api/auth/refresh ─────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    let oldRefreshToken: string

    beforeAll(() => {
      oldRefreshToken = refreshToken
    })

    it('should rotate tokens and return a new pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200)

      expect(res.body.data.accessToken).toBeDefined()
      expect(res.body.data.refreshToken).toBeDefined()
      // New refresh token must be different (rotation)
      expect(res.body.data.refreshToken).not.toBe(oldRefreshToken)

      accessToken = res.body.data.accessToken
      refreshToken = res.body.data.refreshToken
    })

    it('should reject the old (rotated) refresh token with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401)
    })

    it('should reject a completely invalid token with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'this.is.fake' })
        .expect(401)
    })
  })

  // ── POST /api/auth/logout ──────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should logout and return 204 No Content', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(204)
    })

    it('should reject the invalidated refresh token after logout with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401)
    })
  })

  // ── DB state verification ──────────────────────────────────────────────────

  describe('Database state', () => {
    it('should have created the tenant in the DB', async () => {
      const user = await prisma.user.findFirst({
        where: { email: testOrg.email },
        include: { tenant: true }
      })
      expect(user).not.toBeNull()
      expect(user!.tenant.name).toBe(testOrg.organizationName)
    })

    it('should have created the admin user with ADMIN role', async () => {
      const user = await prisma.user.findFirst({
        where: { email: testOrg.email },
      })
      expect(user).not.toBeNull()
      expect(user!.role).toBe('ADMIN')
    })

    it('should have invalidated the logout refresh token in DB', async () => {
      const userId = decodePayload(accessToken)['sub'] as string
      // The specific token used for logout must not exist
      const loggedOutToken = await prisma.refreshToken.findFirst({
        where: { userId, token: refreshToken },
      })
      expect(loggedOutToken).toBeNull()
    })
  })
})
