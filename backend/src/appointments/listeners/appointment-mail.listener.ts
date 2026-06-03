import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Appointment, Client, Professional, Service } from '@prisma/client';

@Injectable()
export class AppointmentMailListener {
  private readonly logger = new Logger(AppointmentMailListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('appointment.created', { async: true })
  async handleAppointmentCreatedEvent(appointment: Appointment & { client: Client, professional: Professional, service: Service }) {
    // Solo enviamos correo si es un turno creado desde el lado público
    if (appointment.bookedVia === 'PANEL') {
      this.logger.log(`Turno creado internamente (PANEL). No se envía email a ${appointment.client.email}`);
      return;
    }

    // Verificar si el negocio tiene habilitada la opción de emails de confirmación
    const tenant = await this.prisma.tenant.findUnique({ where: { id: appointment.tenantId } });
    if (tenant && !tenant.confirmEmail) {
      this.logger.log(`Email confirmations are disabled for tenant ${tenant.name} (${tenant.id}). Skipping.`);
      return;
    }

    if (!appointment.client.email) {
      this.logger.warn(`El cliente no tiene email registrado. Omitiendo notificación.`);
      return;
    }

    const { client, professional, service } = appointment;
    
    // Formatear fechas para Argentina por defecto o local
    const dateObj = new Date(appointment.startTime);
    const tz = tenant?.timezone || 'America/Argentina/Buenos_Aires';
    const date = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz });
    const time = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: tz }) + ' hs';
    
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
          cancelLink: `${this.configService.get('FRONTEND_URL')}/booking/cancel/${appointment.cancelToken || appointment.id}`, 
          year: new Date().getFullYear(),
        },
      });
    } catch (error) {
      this.logger.error(`Fallo crítico enviando email de confirmación en segundo plano: ${error.message}`);
    }
  }
}
