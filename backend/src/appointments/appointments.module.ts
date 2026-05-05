import { Module } from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { AvailabilityEngineService } from './availability-engine.service'
import { AppointmentsController } from './appointments.controller'
import { PublicAppointmentsController } from './public-appointments.controller'
import { TenantsModule } from '../tenants/tenants.module'
import { MailModule } from '../mail/mail.module'
import { AppointmentMailListener } from './listeners/appointment-mail.listener'

import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { AppointmentWhatsappListener } from './listeners/appointment-whatsapp.listener'

@Module({
  imports: [TenantsModule, MailModule, SubscriptionsModule, WhatsappModule],
  controllers: [AppointmentsController, PublicAppointmentsController],
  providers: [
    AppointmentsService, 
    AvailabilityEngineService, 
    AppointmentMailListener,
    AppointmentWhatsappListener
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
