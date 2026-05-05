import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { WhatsappController } from './whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  providers: [WhatsappService, WhatsappTemplateService],
  controllers: [WhatsappController],
  exports: [WhatsappService, WhatsappTemplateService]
})
export class WhatsappModule {}
