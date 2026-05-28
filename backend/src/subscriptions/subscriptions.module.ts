import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ReferralsService } from './referrals.service';
import { SubscriptionsController } from './subscriptions.controller';
import { ReferralsController } from './referrals.controller';
import { MercadoPagoWebhooksController } from './webhooks.controller';

@Module({
  controllers: [SubscriptionsController, ReferralsController, MercadoPagoWebhooksController],
  providers: [SubscriptionsService, ReferralsService],
  exports: [SubscriptionsService, ReferralsService],
})
export class SubscriptionsModule {}
