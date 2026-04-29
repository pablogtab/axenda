import { Module } from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { AvailabilityEngineService } from './availability-engine.service'
import { AppointmentsController } from './appointments.controller'
import { PublicAppointmentsController } from './public-appointments.controller'
import { TenantsModule } from '../tenants/tenants.module'
import { MailModule } from '../mail/mail.module'
import { AppointmentMailListener } from './listeners/appointment-mail.listener'

@Module({
  imports: [TenantsModule, MailModule],
  controllers: [AppointmentsController, PublicAppointmentsController],
  providers: [AppointmentsService, AvailabilityEngineService, AppointmentMailListener],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
