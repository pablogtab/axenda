import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { AppointmentCreatedEvent } from '../events/appointment-created.event';

@Injectable()
export class AppointmentMailListener {
  private readonly logger = new Logger(AppointmentMailListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('appointment.created')
  async handleAppointmentCreatedEvent(payload: AppointmentCreatedEvent) {
    // Solo enviamos correo si es un turno creado desde el lado público
    if (!payload.isPublic) {
      this.logger.log(`Turno creado internamente (Tenant). No se envía email a ${payload.client.email}`);
      return;
    }

    if (!payload.client.email) {
      this.logger.warn(`El cliente no tiene email registrado. Omitiendo notificación.`);
      return;
    }

    const { appointment, client, professional, service } = payload;
    
    // Formatear fechas para Argentina por defecto o local
    const dateObj = new Date(appointment.startTime);
    const date = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const time = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' hs';
    
    const priceNumber = service.price ? Number(service.price) : 0;
    const priceFormatted = priceNumber > 0 ? `$ ${priceNumber.toLocaleString('es-ES')}` : 'Gratis';

    this.logger.log(`Preparando envío asíncrono de confirmación para: ${client.email}`);

    try {
      await this.mailService.sendMail({
        to: client.email,
        subject: '¡Turno Confirmado en Axenda!',
        template: 'booking-confirmation',
        context: {
          clientName: client.firstName,
          professionalName: `${professional.firstName} ${professional.lastName}`,
          serviceName: service.name,
          date,
          time,
          price: priceFormatted,
          calendarLink: 'https://calendar.google.com/calendar/r/eventedit', // TODO: Generar link dinámico
          cancelLink: `${this.configService.get('FRONTEND_URL')}/booking/cancel/${appointment.id}`, 
          year: new Date().getFullYear(),
        },
      });
    } catch (error) {
      this.logger.error(`Fallo crítico enviando email de confirmación en segundo plano: ${error.message}`);
    }
  }
}
