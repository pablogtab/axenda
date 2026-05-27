import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { WHATSAPP_PACKS } from './constants/whatsapp-packs';

describe('SubscriptionsService - Packs & Billing', () => {
  let service: SubscriptionsService;
  let prismaMock: any;
  let mpServiceMock: any;
  let configServiceMock: any;

  beforeEach(async () => {
    prismaMock = {
      tenantWhatsappPack: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      tenantSubscription: {
        findUnique: jest.fn(),
      },
      subscriptionPlan: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      subscriptionInvoice: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      professional: {
        count: jest.fn(),
      },
      branch: {
        count: jest.fn(),
      },
      appointment: {
        count: jest.fn(),
      },
      tenantWhatsappConfig: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((cmds) => Promise.all(cmds)),
    };

    mpServiceMock = {
      createPreference: jest.fn(),
      getPayment: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MercadoPagoService, useValue: mpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    // Disable onModuleInit to avoid calling syncPlansWithMercadoPago during tests
    jest.spyOn(SubscriptionsService.prototype, 'onModuleInit').mockImplementation(() => Promise.resolve());

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('getSubscriptionStatus', () => {
    it('should sum up all active and unexpired whatsapp packs remaining values', async () => {
      const mockSub = {
        id: 'sub-1',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        plan: {
          code: 'PRO',
          name: 'Pro Plan',
          maxProfessionals: 5,
          maxBranches: 3,
          maxAppointments: 500,
          maxUsers: 10,
          maxWhatsapp: 500,
          hasReports: true,
          hasOnlinePayments: true,
          hasAutoReviews: true,
        },
      };

      prismaMock.tenantSubscription.findUnique.mockResolvedValue(mockSub);
      prismaMock.professional.count.mockResolvedValue(2);
      prismaMock.branch.count.mockResolvedValue(1);
      prismaMock.user.count.mockResolvedValue(3);
      prismaMock.appointment.count.mockResolvedValue(120);
      prismaMock.tenantWhatsappConfig.findUnique.mockResolvedValue({ messagesSentMonth: 80 });

      // Mock two packs: one has 40 remaining, one has 60 remaining
      prismaMock.tenantWhatsappPack.findMany.mockResolvedValue([
        { id: 'pack-1', quantity: 100, remaining: 40, expiresAt: new Date() },
        { id: 'pack-2', quantity: 500, remaining: 60, expiresAt: new Date() },
      ]);

      const status = await service.getSubscriptionStatus('tenant-1');
      expect(status.usage.extraWhatsappBalance).toBe(100);
      expect(status.usage.extraWhatsappTotal).toBe(600);
      expect(status.activePacks).toHaveLength(2);
      expect(status.activePacks[0].quantity).toBe(100);
      expect(status.activePacks[1].quantity).toBe(500);
      expect(prismaMock.tenantWhatsappPack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            remaining: { gt: 0 },
            expiresAt: { gt: expect.any(Date) },
          }),
        })
      );
    });
  });

  describe('createPackCheckout', () => {
    it('should create preference and return init_point for a valid pack', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@axenda.com',
        tenantId: 'tenant-123',
      });

      mpServiceMock.createPreference.mockResolvedValue({
        init_point: 'http://mercadopago.com/init-point-123',
      });

      const result = await service.createPackCheckout('user-123', 'WPP_PACK_500');

      expect(mpServiceMock.createPreference).toHaveBeenCalledWith({
        title: 'Axenda - Pack 500 Mensajes WhatsApp',
        amount: WHATSAPP_PACKS.WPP_PACK_500.price,
        quantity: 1,
        externalReference: 'tenant-123:WPP_PACK_500:ONETIME:1',
        backUrl: expect.stringContaining('/dashboard/subscription/success'),
        payerEmail: 'user@axenda.com',
      });
      expect(result).toEqual({ initPoint: 'http://mercadopago.com/init-point-123' });
    });

    it('should throw BadRequestException if pack code is invalid', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        tenantId: 'tenant-123',
      });

      await expect(service.createPackCheckout('user-123', 'INVALID_PACK')).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleMercadoPagoPayment for WhatsApp packs', () => {
    it('should create a pack and create a paid invoice upon approved payment', async () => {
      const mockPayment = {
        id: 998877,
        status: 'approved',
        external_reference: 'tenant-123:WPP_PACK_500:ONETIME:1',
        transaction_amount: WHATSAPP_PACKS.WPP_PACK_500.price,
        currency_id: 'ARS',
      };

      prismaMock.subscriptionInvoice.findFirst.mockResolvedValue(null); // No duplicate
      prismaMock.tenantSubscription.findUnique.mockResolvedValue({
        id: 'sub-abc',
        tenantId: 'tenant-123',
      });

      await service.handleMercadoPagoPayment(mockPayment);

      expect(prismaMock.tenantWhatsappPack.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          quantity: 500,
          remaining: 500,
          expiresAt: expect.any(Date),
        }),
      });

      expect(prismaMock.subscriptionInvoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subscriptionId: 'sub-abc',
          amount: 25000,
          status: 'PAID',
          externalPaymentId: '998877',
          description: 'Pack 500 Mensajes WhatsApp',
        }),
      });
    });

    it('should do nothing if invoice already exists (double processing prevention)', async () => {
      const mockPayment = {
        id: 998877,
        status: 'approved',
        external_reference: 'tenant-123:WPP_PACK_500:ONETIME:1',
      };

      prismaMock.subscriptionInvoice.findFirst.mockResolvedValue({ id: 'existing-inv' });

      await service.handleMercadoPagoPayment(mockPayment);

      expect(prismaMock.tenantWhatsappPack.create).not.toHaveBeenCalled();
      expect(prismaMock.subscriptionInvoice.create).not.toHaveBeenCalled();
    });
  });
});
