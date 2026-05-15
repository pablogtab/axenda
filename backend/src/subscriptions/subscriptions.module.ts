import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { MercadoPagoWebhooksController } from './webhooks.controller';

@Module({
  controllers: [SubscriptionsController, MercadoPagoWebhooksController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
