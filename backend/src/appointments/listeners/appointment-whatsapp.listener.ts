import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { Appointment } from '@prisma/client';

@Injectable()
export class AppointmentWhatsappListener {
  private readonly logger = new Logger(AppointmentWhatsappListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @OnEvent('appointment.created')
  async handleAppointmentCreated(appointment: Appointment) {
    // 1. Obtener datos necesarios: cliente, profesional y negocio
    const [client, professional, tenant] = await Promise.all([
      this.prisma.client.findUnique({ where: { id: appointment.clientId } }),
      this.prisma.professional.findUnique({ where: { id: appointment.professionalId } }),
      this.prisma.tenant.findUnique({ where: { id: appointment.tenantId } }),
    ]);

    if (!client?.phone || !professional || !tenant) {
      this.logger.warn(`Incomplete data to send WhatsApp for appointment ${appointment.id}`);
      return;
    }

    // 2. Formatear fecha y hora para el mensaje
    const dateObj = new Date(appointment.startTime);
    const dateStr = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';

    // 3. Preparar variables nombradas (Mapean con los {{variable}} de la plantilla)
    const variables = {
      clientName: client.firstName,
      professionalName: professional.firstName,
      businessName: tenant.name,
      appointmentDate: dateStr,
      appointmentTime: timeStr,
    };

    try {
      /**
       * Enviamos usando el nombre de referencia de la acción global.
       * El WhatsappService resolverá si usa la plantilla global de Axenda
       * o una personalizada que el cliente haya configurado para reemplazarla.
       */
      await this.whatsappService.sendTemplateMessage(
        appointment.tenantId,
        client.phone,
        'axenda_booking_confirmation',
        variables
      );

      this.logger.log(`WhatsApp confirmation sent to ${client.phone} for tenant ${appointment.tenantId}`);
    } catch (error) {
      // No bloqueamos el flujo principal si falla el envío de WhatsApp
      this.logger.error(`Failed to send WhatsApp confirmation: ${error.message}`);
    }
  }
}
