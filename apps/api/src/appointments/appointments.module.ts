import { Module } from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { AvailabilityEngineService } from './availability-engine.service'
import { AppointmentsController } from './appointments.controller'

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AvailabilityEngineService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
