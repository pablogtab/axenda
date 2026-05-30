import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
process.env['NODE_ENV'] = 'test';

import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app/app.module';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, AuthProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Admin Backoffice — Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let regularAdminToken: string;
  let testTenantId: string;
  let couponId: string;
  let systemUserId: string;

  const superAdminEmail = `super-${Date.now()}@admin.com`;
  const superAdminPassword = 'SuperAdminPass123!';
  const regularAdminEmail = `reg-${Date.now()}@tenant.com`;
  const regularAdminPassword = 'RegularPass123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);

    // 1. Create a SystemUser (super admin) in system_users table — NOT in users table
    const superPasswordHash = await bcrypt.hash(superAdminPassword, 1);
    const systemUser = await prisma.systemUser.create({
      data: {
        email: superAdminEmail,
        firstName: 'System',
        lastName: 'Administrator',
        passwordHash: superPasswordHash,
        active: true,
      },
    });
    systemUserId = systemUser.id;

    // 2. Create a regular tenant admin user (in users table as before)
    const regularTenant = await prisma.tenant.create({
      data: {
        name: 'Regular Test Org',
        slug: `regular-slug-${Date.now()}`,
        publicSlug: `regular-pub-slug-${Date.now()}`,
        email: regularAdminEmail,
        active: true,
        onboardingCompleted: true,
      },
    });
    testTenantId = regularTenant.id;

    const regularPasswordHash = await bcrypt.hash(regularAdminPassword, 1);
    await prisma.user.create({
      data: {
        email: regularAdminEmail,
        tenantId: regularTenant.id,
        role: UserRole.ADMIN,
        firstName: 'Regular',
        lastName: 'User',
        active: true,
        identities: {
          create: {
            provider: AuthProvider.EMAIL,
            providerId: regularAdminEmail,
            passwordHash: regularPasswordHash,
          },
        },
      },
    });

    // 3. Log in both to retrieve tokens
    const superLogin = await request(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ email: superAdminEmail, password: superAdminPassword })
      .expect(200);
    superAdminToken = superLogin.body.data.accessToken;

    const regularLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: regularAdminEmail, password: regularAdminPassword, turnstileToken: 'test-token' })
      .expect(200);
    regularAdminToken = regularLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    // Remove system_user
    await prisma.systemUser.deleteMany({
      where: { email: superAdminEmail },
    });
    // Remove regular tenant (cascades users)
    await prisma.tenant.deleteMany({
      where: { email: regularAdminEmail },
    });
    await app.close();
  });

  describe('POST /api/admin/auth/login', () => {
    it('should authenticate a valid SystemUser (super admin)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({ email: superAdminEmail, password: superAdminPassword })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject authentication for a regular tenant user (not in system_users)', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({ email: regularAdminEmail, password: regularAdminPassword })
        .expect(401);
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/auth/login')
        .send({ email: superAdminEmail, password: 'WrongPassword!' })
        .expect(401);
    });
  });

  describe('Access Control', () => {
    it('should forbid access to metrics for regular tenant users', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .expect(403);
    });

    it('should allow access to metrics for system users (super-admins)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.data.totalTenants).toBeDefined();
      expect(res.body.data.estimatedMrr).toBeDefined();
    });
  });

  describe('Tenants Management', () => {
    it('should allow super-admins to list and search tenants', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/tenants?search=Regular')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.data.total).toBeGreaterThan(0);
      const regularOrg = res.body.data.data.find((t: any) => t.id === testTenantId);
      expect(regularOrg).toBeDefined();
      expect(regularOrg._count.users).toBe(1);
    });

    it('should allow super-admins to override a tenant subscription', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const res = await request(app.getHttpServer())
        .patch(`/api/admin/tenants/${testTenantId}/subscription`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          planCode: 'PRO',
          billingCycle: 'MONTHLY',
          status: 'ACTIVE',
          endDate: futureDate.toISOString(),
        })
        .expect(200);

      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.plan.code).toBe('PRO');
      expect(new Date(res.body.data.endDate).getDate()).toBe(futureDate.getDate());
    });
  });

  describe('Coupons Management', () => {
    const couponCode = `ADMINTEST-${Date.now()}`;

    it('should allow super-admins to create a system coupon', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: couponCode,
          discountPercent: 15.5,
          isSystem: true,
          onlyFirstPayment: false,
          maxUses: 100,
        })
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toBe(couponCode);
      expect(Number(res.body.data.discountPercent)).toBe(15.5);
      couponId = res.body.data.id;
    });

    it('should list all coupons including the new one', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/coupons')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      const coupon = res.body.data.find((c: any) => c.id === couponId);
      expect(coupon).toBeDefined();
    });

    it('should allow updating an existing coupon', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/coupons/${couponId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          active: false,
          discountPercent: 20,
        })
        .expect(200);

      expect(res.body.data.active).toBe(false);
      expect(Number(res.body.data.discountPercent)).toBe(20);
    });

    it('should allow deleting a coupon', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/coupons/${couponId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Verify deletion
      const res = await request(app.getHttpServer())
        .get('/api/admin/coupons')
        .set('Authorization', `Bearer ${superAdminToken}`);
      const coupon = res.body.data.find((c: any) => c.id === couponId);
      expect(coupon).toBeUndefined();
    });
  });
});
