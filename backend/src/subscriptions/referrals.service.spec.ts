import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      referralCode: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      referralUsage: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      tenantSubscription: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cmds) => Promise.all(cmds)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  describe('validateCode', () => {
    it('should throw BadRequestException if code does not exist', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue(null);

      await expect(
        service.validateCode('INVALID_CODE', 'tenant-123', 'PRO')
      ).rejects.toThrow(new BadRequestException('Este código de descuento no está disponible.'));
    });

    it('should throw BadRequestException if code is inactive', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'INACTIVE10',
        active: false,
      });

      await expect(
        service.validateCode('INACTIVE10', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code has expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'EXPIRED10',
        active: true,
        expiresAt: pastDate,
      });

      await expect(
        service.validateCode('EXPIRED10', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code has reached max uses', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'MAXED10',
        active: true,
        maxUses: 5,
        usesCount: 5,
      });

      await expect(
        service.validateCode('MAXED10', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if tenant attempts to self-refer', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'SELF10',
        active: true,
        referrerTenantId: 'tenant-123',
      });

      await expect(
        service.validateCode('SELF10', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code is restricted to a different plan', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'BIZONLY',
        active: true,
        applicablePlanCode: 'BUSINESS',
      });

      await expect(
        service.validateCode('BIZONLY', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user code applied after 14 days from registration', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'USER10',
        active: true,
        isSystem: false,
      });

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15);

      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        createdAt: oldDate,
        subscription: {
          invoices: [],
        },
      });

      await expect(
        service.validateCode('USER10', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if onlyFirstPayment is true and tenant has paid invoices', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'WELCOME10',
        active: true,
        onlyFirstPayment: true,
      });

      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        createdAt: new Date(),
        subscription: {
          invoices: [
            { id: 'inv-1', status: 'PAID' },
          ],
        },
      });

      await expect(
        service.validateCode('WELCOME10', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if tenant has already applied THIS code', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-1',
        code: 'PROMO10',
        active: true,
      });

      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        createdAt: new Date(),
        subscription: {
          invoices: [],
        },
      });

      prismaMock.referralUsage.findFirst.mockImplementation((params: any) => {
        if (params.where.referralCodeId === 'code-1' && params.where.tenantId === 'tenant-123') {
          return Promise.resolve({ id: 'usage-1' });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.validateCode('PROMO10', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if tenant has already used a non-system code in the past', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-new',
        code: 'USER_NEW',
        active: true,
        isSystem: false,
      });

      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        createdAt: new Date(),
        subscription: {
          invoices: [],
        },
      });

      // No double use of *this* code
      prismaMock.referralUsage.findFirst.mockImplementation((params: any) => {
        if (params.where.tenantId === 'tenant-123' && params.where.referralCode?.isSystem === false) {
          return Promise.resolve({ id: 'previous-usage-from-friend' });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.validateCode('USER_NEW', 'tenant-123', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if a circular referral loop is detected (A -> B -> A)', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-b',
        code: 'CODE_B',
        active: true,
        isSystem: false,
        referrerTenantId: 'tenant-b', // El dueño del código es B
      });

      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-a', // El que quiere usarlo es A
        createdAt: new Date(),
        subscription: { invoices: [] },
      });

      // Buscamos quién refirió a B: fue A (bucle circular)
      prismaMock.referralUsage.findFirst.mockImplementation((params: any) => {
        if (params.where.tenantId === 'tenant-b') {
          return Promise.resolve({
            id: 'usage-abc',
            referralCode: {
              referrerTenantId: 'tenant-a',
            },
          });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.validateCode('CODE_B', 'tenant-a', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if a deep circular referral loop is detected (A -> B -> C -> A)', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-c',
        code: 'CODE_C',
        active: true,
        isSystem: false,
        referrerTenantId: 'tenant-c', // C es el dueño del código
      });

      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-a', // A quiere usar el código de C
        createdAt: new Date(),
        subscription: { invoices: [] },
      });

      // Trace:
      // A quiere usar código de C.
      // Quién refirió a C? B (tenantId = tenant-c, referrerTenantId = tenant-b)
      // Quién refirió a B? A (tenantId = tenant-b, referrerTenantId = tenant-a)
      prismaMock.referralUsage.findFirst.mockImplementation((params: any) => {
        if (params.where.tenantId === 'tenant-c') {
          return Promise.resolve({
            id: 'usage-c',
            referralCode: { referrerTenantId: 'tenant-b' },
          });
        }
        if (params.where.tenantId === 'tenant-b') {
          return Promise.resolve({
            id: 'usage-b',
            referralCode: { referrerTenantId: 'tenant-a' },
          });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.validateCode('CODE_C', 'tenant-a', 'PRO')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coupon has referrerId and is used by a DIFFERENT tenant', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-personal',
        code: 'PABLO-PROMO',
        active: true,
        isSystem: true,
        referrerId: 'user-pablo',       // asignado al usuario pablo
        referrerTenantId: null,         // cupón de sistema (creado desde backoffice)
        applicablePlanCode: null,
        maxUses: null,
        usesCount: 0,
        expiresAt: null,
      });

      // El usuario pablo pertenece al tenant 'tenant-pablo'
      prismaMock.user.findUnique.mockResolvedValue({ tenantId: 'tenant-pablo' });

      // Pero quien intenta usarlo es 'tenant-otro'
      await expect(
        service.validateCode('PABLO-PROMO', 'tenant-otro', 'PRO')
      ).rejects.toThrow(new BadRequestException('Este código de descuento no está disponible.'));
    });

    it('should allow the correct tenant to apply a coupon with referrerId assigned to their user', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-personal',
        code: 'PABLO-PROMO',
        active: true,
        isSystem: true,
        referrerId: 'user-pablo',
        referrerTenantId: null,
        applicablePlanCode: null,
        maxUses: null,
        usesCount: 0,
        expiresAt: null,
        onlyFirstPayment: false,
      });

      // El usuario pablo pertenece al tenant 'tenant-pablo'
      prismaMock.user.findUnique.mockResolvedValue({ tenantId: 'tenant-pablo' });

      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-pablo',
        createdAt: new Date(),
        subscription: { invoices: [] },
      });

      prismaMock.referralUsage.findFirst.mockResolvedValue(null);

      const res = await service.validateCode('PABLO-PROMO', 'tenant-pablo', 'PRO');
      expect(res.valid).toBe(true);
      expect(res.code).toBe('PABLO-PROMO');
    });

    it('should succeed and return details if all validations pass', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-ok',
        code: 'PROMO10',
        active: true,
        isSystem: true,
        discountPercent: 10.00,
        applicablePlanCode: 'PRO',
      });

      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        createdAt: new Date(),
        subscription: { invoices: [] },
      });

      prismaMock.referralUsage.findFirst.mockResolvedValue(null);

      const res = await service.validateCode('PROMO10', 'tenant-123', 'PRO');
      expect(res).toEqual({
        valid: true,
        id: 'code-ok',
        code: 'PROMO10',
        discountPercent: 10,
        isSystem: true,
        applicablePlanCode: 'PRO',
      });
    });
  });

  describe('getOrCreateUserCode', () => {
    it('should throw ForbiddenException if user is on STARTER plan', async () => {
      prismaMock.tenantSubscription.findUnique.mockResolvedValue({
        status: 'ACTIVE',
        plan: { code: 'STARTER' }
      });

      await expect(
        service.getOrCreateUserCode('user-1', 'tenant-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is in trial (status: TRIALING)', async () => {
      prismaMock.tenantSubscription.findUnique.mockResolvedValue({
        status: 'TRIALING',
        plan: { code: 'PRO' }
      });

      await expect(
        service.getOrCreateUserCode('user-1', 'tenant-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return existing code if user already has one and sum rewardedDays correctly', async () => {
      prismaMock.tenantSubscription.findUnique.mockResolvedValue({
        status: 'ACTIVE',
        plan: { code: 'BUSINESS' }
      });

      prismaMock.referralCode.findFirst.mockResolvedValue({
        id: 'code-123',
        code: 'JUAN-4491',
        discountPercent: 10.00,
      });

      prismaMock.referralUsage.findMany.mockResolvedValue([
        { id: 'usage-1', rewardedDays: 15, invoice: { subscription: { plan: { code: 'PRO' } } } },
        { id: 'usage-2', rewardedDays: 10, invoice: { subscription: { plan: { code: 'BUSINESS' } } } },
        { id: 'usage-3', rewardedDays: 5, invoice: { subscription: { plan: { code: 'ELITE' } } } },
      ]);

      const res = await service.getOrCreateUserCode('user-1', 'tenant-1');
      expect(res).toEqual({
        code: 'JUAN-4491',
        discountPercent: 10,
        totalReferrals: 3,
        benefitsEarned: '30 días gratis acumulados',
      });
    });

    it('should generate a new code and return it if user does not have one', async () => {
      prismaMock.tenantSubscription.findUnique.mockResolvedValue({
        status: 'ACTIVE',
        plan: { code: 'PRO' }
      });
      prismaMock.referralCode.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        firstName: 'Pablo',
        lastName: 'Gomez',
      });
      prismaMock.referralCode.findUnique.mockResolvedValue(null); // Unique code
      prismaMock.referralCode.create.mockResolvedValue({
        code: 'PABLO-EF2A',
        discountPercent: 10.00,
      });

      const res = await service.getOrCreateUserCode('user-1', 'tenant-1');
      expect(res).toEqual({
        code: 'PABLO-EF2A',
        discountPercent: 10,
        totalReferrals: 0,
        benefitsEarned: '0 días gratis acumulados',
      });

      expect(prismaMock.referralCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: expect.stringMatching(/^PABLO-[A-Z0-9]{4}$/),
          discountPercent: 10.00,
          isSystem: false,
          referrerId: 'user-1',
          referrerTenantId: 'tenant-1',
        }),
      });
    });
  });

  describe('updateMyCode', () => {
    beforeEach(() => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-1',
      });
      prismaMock.tenantSubscription.findUnique.mockResolvedValue({
        status: 'ACTIVE',
        plan: { code: 'PRO' },
      });
    });

    it('should throw ForbiddenException if user is in trial (status: TRIALING)', async () => {
      prismaMock.tenantSubscription.findUnique.mockResolvedValue({
        status: 'TRIALING',
        plan: { code: 'PRO' },
      });

      await expect(
        service.updateMyCode('user-1', 'NEWCODE')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is on STARTER plan', async () => {
      prismaMock.tenantSubscription.findUnique.mockResolvedValue({
        status: 'ACTIVE',
        plan: { code: 'STARTER' },
      });

      await expect(
        service.updateMyCode('user-1', 'NEWCODE')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if code violates regex format or length', async () => {
      await expect(service.updateMyCode('user-1', 'AB')).rejects.toThrow(BadRequestException);
      await expect(service.updateMyCode('user-1', 'CODE_WITH_SPACES')).rejects.toThrow(BadRequestException);
      await expect(service.updateMyCode('user-1', 'TOO_LONG_CODE_WITH_MORE_THAN_15_CHARS')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code contains reserved words', async () => {
      await expect(service.updateMyCode('user-1', 'AXENDA-GIFT')).rejects.toThrow(BadRequestException);
      await expect(service.updateMyCode('user-1', 'MY-ADMIN-CODE')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code contains profanities', async () => {
      await expect(service.updateMyCode('user-1', 'SHIT-CODE')).rejects.toThrow(BadRequestException);
      await expect(service.updateMyCode('user-1', 'BOLUDO10')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code is already in use by another user', async () => {
      prismaMock.referralCode.findFirst.mockResolvedValueOnce({
        id: 'other-code',
        code: 'USED-CODE',
        referrerId: 'user-other',
      });

      await expect(service.updateMyCode('user-1', 'USED-CODE')).rejects.toThrow(BadRequestException);
    });

    it('should update and return code stats if customization is valid', async () => {
      // 1. mock no duplicate exists
      prismaMock.referralCode.findFirst.mockResolvedValueOnce(null);

      // 2. mock current code exists
      prismaMock.referralCode.findFirst.mockResolvedValueOnce({
        id: 'code-123',
        code: 'JUAN-4491',
        referrerTenantId: 'tenant-1',
      });

      // 3. mock update
      prismaMock.referralCode.update.mockResolvedValue({
        id: 'code-123',
        code: 'JUAN-CUSTOM',
        discountPercent: 10.00,
      });

      // 4. mock findFirst for getOrCreateUserCode to find the updated code
      prismaMock.referralCode.findFirst.mockResolvedValueOnce({
        id: 'code-123',
        code: 'JUAN-CUSTOM',
        discountPercent: 10.00,
        referrerTenantId: 'tenant-1',
      });

      // 5. mock findMany usages for stats
      prismaMock.referralUsage.findMany.mockResolvedValue([]);

      const res = await service.updateMyCode('user-1', 'JUAN-CUSTOM');
      expect(res).toEqual({
        code: 'JUAN-CUSTOM',
        discountPercent: 10,
        totalReferrals: 0,
        benefitsEarned: '0 días gratis acumulados',
      });

      expect(prismaMock.referralCode.update).toHaveBeenCalledWith({
        where: { id: 'code-123' },
        data: { code: 'JUAN-CUSTOM' },
      });
    });
  });
});
