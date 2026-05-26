import { Controller, Get, Post, UseGuards, Body, Query, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { VerifySubscriptionDto } from './dto/verify-subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  async getStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.subscriptionsService.getSubscriptionStatus(tenantId);
  }

  @Get('plans')
  async getPlans() {
    return this.subscriptionsService['prisma'].subscriptionPlan.findMany({
      where: { active: true, code: { not: 'STARTER' } },
      orderBy: { priceMonthly: 'asc' }
    });
  }

  @Post('checkout')
  async createCheckout(
    @CurrentUser('sub') userId: string,
    @Body() body: CreateCheckoutDto
  ) {
    return this.subscriptionsService.createCheckout(userId, body.planId, body.billingCycle, body.quantity || 1);
  }

  @Get('verify')
  async verifySubscription(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: VerifySubscriptionDto
  ) {
    const idToVerify = query.payment_id || query.collection_id || query.preapproval_id;
    if (!idToVerify) {
      throw new BadRequestException('Se requiere un ID de pago o suscripción para verificar');
    }
    return this.subscriptionsService.verifySubscription(tenantId, idToVerify);
  }

  @Get('invoices')
  async getInvoices(@CurrentUser('tenantId') tenantId: string) {
    return this.subscriptionsService.getSubscriptionInvoices(tenantId);
  }

  // TODO: Proteger esto con un guard de Admin de Sistema (SuperAdmin)
  @Post('sync')
  async syncPlans() {
    return this.subscriptionsService.syncPlansWithMercadoPago();
  }
}
