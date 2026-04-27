import { Module } from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { AvailabilityEngineService } from './availability-engine.service'
import { AppointmentsController } from './appointments.controller'
import { PublicAppointmentsController } from './public-appointments.controller'
import { TenantsModule } from '../tenants/tenants.module'

@Module({
  imports: [TenantsModule],
  controllers: [AppointmentsController, PublicAppointmentsController],
  providers: [AppointmentsService, AvailabilityEngineService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
