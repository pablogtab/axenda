import { Module } from '@nestjs/common'
import { ProfessionalsService } from './professionals.service'
import { ProfessionalsController } from './professionals.controller'

import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

@Module({
  imports: [SubscriptionsModule],
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
