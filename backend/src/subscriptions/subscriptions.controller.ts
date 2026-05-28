import { Controller, Get, Post, UseGuards, Body, Query, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { VerifySubscriptionDto } from './dto/verify-subscription.dto';
import { CreatePackCheckoutDto } from './dto/create-pack-checkout.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.subscriptionsService.getSubscriptionStatus(tenantId);
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  async getPlans() {
    return this.subscriptionsService['prisma'].subscriptionPlan.findMany({
      where: { active: true, code: { not: 'STARTER' } },
      orderBy: { priceMonthly: 'asc' }
    });
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig() {
    return {
      paymentsEnabled: this.subscriptionsService.isPaymentsEnabled()
    };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @CurrentUser('sub') userId: string,
    @Body() body: CreateCheckoutDto
  ) {
    return this.subscriptionsService.createCheckout(userId, body.planId, body.billingCycle, body.quantity || 1, body.referralCode);
  }

  @Post('checkout-pack')
  @UseGuards(JwtAuthGuard)
  async createPackCheckout(
    @CurrentUser('sub') userId: string,
    @Body() body: CreatePackCheckoutDto
  ) {
    return this.subscriptionsService.createPackCheckout(userId, body.packCode);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
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

  @Get('public-verify')
  async verifySubscriptionPublic(
    @Query() query: VerifySubscriptionDto
  ) {
    const idToVerify = query.payment_id || query.collection_id || query.preapproval_id;
    if (!idToVerify) {
      throw new BadRequestException('Se requiere un ID de pago o suscripción para verificar');
    }
    return this.subscriptionsService.verifySubscriptionPublic(idToVerify);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  async getInvoices(@CurrentUser('tenantId') tenantId: string) {
    return this.subscriptionsService.getSubscriptionInvoices(tenantId);
  }

  // TODO: Proteger esto con un guard de Admin de Sistema (SuperAdmin)
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncPlans() {
    return this.subscriptionsService.syncPlansWithMercadoPago();
  }
}
