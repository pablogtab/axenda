import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let serviceMock: any;

  beforeEach(async () => {
    serviceMock = {
      prisma: {
        subscriptionPlan: {
          findMany: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        { provide: SubscriptionsService, useValue: serviceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => true,
      })
      .compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
  });

  describe('GET plans', () => {
    it('should return active subscription plans sorted by price', async () => {
      const mockPlans = [
        { code: 'STARTER', active: true, priceMonthly: 0 },
        { code: 'PRO', active: true, priceMonthly: 15000 },
        { code: 'BUSINESS', active: true, priceMonthly: 24500 },
      ];
      serviceMock.prisma.subscriptionPlan.findMany.mockResolvedValue(mockPlans);

      const result = await controller.getPlans();

      expect(serviceMock.prisma.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { priceMonthly: 'asc' },
      });
      expect(result).toEqual(mockPlans);
    });
  });
});
