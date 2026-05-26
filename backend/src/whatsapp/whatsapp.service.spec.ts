import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ConfigService } from '@nestjs/config';

describe('WhatsappService - Monthly Reset', () => {
  let service: WhatsappService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      tenantWhatsappConfig: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: SubscriptionsService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should auto-create config with default values if it does not exist', async () => {
    prismaMock.tenantWhatsappConfig.findUnique.mockResolvedValue(null);
    prismaMock.tenantWhatsappConfig.create.mockImplementation(({ data }) => {
      return Promise.resolve({
        id: 'new-config-id',
        ...data,
      });
    });

    const result = await service.getTenantWhatsappConfig('new-tenant-id');

    expect(prismaMock.tenantWhatsappConfig.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'new-tenant-id' },
    });
    expect(prismaMock.tenantWhatsappConfig.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'new-tenant-id',
        verified: false,
        messagesSentMonth: 0,
        lastResetDate: expect.any(Date),
      },
    });
    expect(result.id).toBe('new-config-id');
    expect(result.messagesSentMonth).toBe(0);
    expect(result.verified).toBe(false);
  });

  it('should not reset if the current date is within the monthly cycle', async () => {
    const lastResetDate = new Date();
    // 15 days ago
    lastResetDate.setDate(lastResetDate.getDate() - 15);

    const mockConfig = {
      id: 'config-id',
      tenantId: 'tenant-id',
      messagesSentMonth: 10,
      lastResetDate,
    };

    prismaMock.tenantWhatsappConfig.findUnique.mockResolvedValue(mockConfig);

    const result = await service.getTenantWhatsappConfig('tenant-id');

    expect(prismaMock.tenantWhatsappConfig.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-id' },
    });
    expect(prismaMock.tenantWhatsappConfig.update).not.toHaveBeenCalled();
    expect(result.messagesSentMonth).toBe(10);
    expect(result.lastResetDate).toBe(lastResetDate);
  });

  it('should reset if the current date is past the monthly cycle', async () => {
    const lastResetDate = new Date();
    // 35 days ago (past the 1-month reset mark)
    lastResetDate.setDate(lastResetDate.getDate() - 35);

    const mockConfig = {
      id: 'config-id',
      tenantId: 'tenant-id',
      messagesSentMonth: 10,
      lastResetDate: new Date(lastResetDate),
    };

    prismaMock.tenantWhatsappConfig.findUnique.mockResolvedValue(mockConfig);
    prismaMock.tenantWhatsappConfig.update.mockImplementation(({ data }) => {
      return Promise.resolve({
        ...mockConfig,
        messagesSentMonth: data.messagesSentMonth,
        lastResetDate: data.lastResetDate,
      });
    });

    const result = await service.getTenantWhatsappConfig('tenant-id');

    expect(prismaMock.tenantWhatsappConfig.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-id' },
    });
    expect(prismaMock.tenantWhatsappConfig.update).toHaveBeenCalled();
    expect(result.messagesSentMonth).toBe(0);
    
    // Check that newResetDate is advanced by exactly 1 month
    const expectedNewResetDate = new Date(lastResetDate);
    expectedNewResetDate.setMonth(expectedNewResetDate.getMonth() + 1);
    expect(result.lastResetDate.getTime()).toBe(expectedNewResetDate.getTime());
  });

  it('should reset multiple months if the tenant has been inactive for a long time', async () => {
    const lastResetDate = new Date();
    // 70 days ago (more than 2 months ago)
    lastResetDate.setDate(lastResetDate.getDate() - 70);

    const mockConfig = {
      id: 'config-id',
      tenantId: 'tenant-id',
      messagesSentMonth: 25,
      lastResetDate: new Date(lastResetDate),
    };

    prismaMock.tenantWhatsappConfig.findUnique.mockResolvedValue(mockConfig);
    prismaMock.tenantWhatsappConfig.update.mockImplementation(({ data }) => {
      return Promise.resolve({
        ...mockConfig,
        messagesSentMonth: data.messagesSentMonth,
        lastResetDate: data.lastResetDate,
      });
    });

    const result = await service.getTenantWhatsappConfig('tenant-id');

    expect(prismaMock.tenantWhatsappConfig.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-id' },
    });
    expect(prismaMock.tenantWhatsappConfig.update).toHaveBeenCalled();
    expect(result.messagesSentMonth).toBe(0);
    
    // Check that newResetDate is advanced to the most recent month anniversary that is still in the past relative to now
    const now = new Date();
    expect(result.lastResetDate.getTime()).toBeLessThanOrEqual(now.getTime());
    
    const nextReset = new Date(result.lastResetDate);
    nextReset.setMonth(nextReset.getMonth() + 1);
    expect(nextReset.getTime()).toBeGreaterThan(now.getTime());
  });
});
