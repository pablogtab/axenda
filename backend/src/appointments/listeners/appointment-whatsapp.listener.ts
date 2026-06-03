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
  ) { }

  @OnEvent('appointment.created')
  async handleAppointmentCreated(appointment: Appointment) {

    // No enviar notificación si fue agendado manualmente desde el panel
    if (appointment.bookedVia === 'PANEL') {
      return;
    }

    // 1. Obtener datos necesarios: cliente, profesional, negocio, sucursal y servicio
    const [client, professional, tenant, branch, service] = await Promise.all([
      this.prisma.client.findUnique({ where: { id: appointment.clientId } }),
      this.prisma.professional.findUnique({ where: { id: appointment.professionalId } }),
      this.prisma.tenant.findUnique({ where: { id: appointment.tenantId } }),
      this.prisma.branch.findUnique({ where: { id: appointment.branchId } }),
      this.prisma.service.findUnique({ where: { id: appointment.serviceId } }),
    ]);

    if (!client?.phone || !professional || !tenant) {
      this.logger.warn(`Incomplete data to send WhatsApp for appointment ${appointment.id}`);
      return;
    }

    // Verificar si el negocio tiene habilitada la opción de recordatorios por WhatsApp
    if (!tenant.whatsappReminder) {
      this.logger.log(`WhatsApp reminders are disabled for tenant ${tenant.name} (${tenant.id}). Skipping.`);
      return;
    }

    // 2. Formatear fecha y hora para el mensaje
    const dateObj = new Date(appointment.startTime);
    const tz = tenant?.timezone || 'America/Argentina/Buenos_Aires';
    const dateStr = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', timeZone: tz });
    const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: tz }) + ' hs';

    const branchAddress = branch?.address || tenant.address || 'Dirección del negocio';
    const profName = `${professional.firstName} ${professional.lastName || ''}`.trim();

    // 3. Preparar variables nombradas (Mapean con los {{variable}} de la plantilla)
    const variables = {
      clientName: client.firstName,
      professionalName: profName,
      businessName: tenant.name,
      serviceName: service?.name || 'Servicio',
      appointmentDate: dateStr,
      appointmentTime: timeStr,
      branchAddress: branchAddress,
      appointmentId: appointment.cancelToken || appointment.id
    };

    // 4. Determinar la plantilla a usar según la opción de cancelar/modificar turnos
    const templateName = tenant.allowReschedule 
      ? 'axenda_booking_confirmation' 
      : 'axenda_booking_confirmation_no_cancel';

    try {
      await this.whatsappService.sendTemplateMessage(
        appointment.tenantId,
        client.phone,
        templateName,
        variables
      );

      this.logger.log(`WhatsApp confirmation (${templateName}) sent to ${client.phone} for tenant ${appointment.tenantId}`);
    } catch (error) {
      // No bloqueamos el flujo principal si falla el envío de WhatsApp
      this.logger.error(`Failed to send WhatsApp confirmation: ${error.message}`);
    }
  }

  @OnEvent('appointment.cancelled')
  async handleAppointmentCancelled(payload: {
    appointment: Appointment & { client?: any; professional?: any; tenant?: any; branch?: any; service?: any }
    notifyClient?: boolean
  }) {
    const { appointment, notifyClient } = payload;

    if (notifyClient === false) {
      this.logger.log(`Skipping WhatsApp cancellation notification for appointment ${appointment.id} as notifyClient is false.`);
      return;
    }

    // 1. Obtener datos necesarios si no vienen precargados
    const [client, professional, tenant, branch, service] = await Promise.all([
      appointment.client || this.prisma.client.findUnique({ where: { id: appointment.clientId } }),
      appointment.professional || this.prisma.professional.findUnique({ where: { id: appointment.professionalId } }),
      this.prisma.tenant.findUnique({ where: { id: appointment.tenantId } }),
      appointment.branch || this.prisma.branch.findUnique({ where: { id: appointment.branchId } }),
      appointment.service || this.prisma.service.findUnique({ where: { id: appointment.serviceId } }),
    ]);

    if (!client?.phone || !professional || !tenant) {
      this.logger.warn(`Incomplete data to send WhatsApp cancellation for appointment ${appointment.id}`);
      return;
    }

    // Verificar si el negocio tiene habilitada la opción de cancelaciones por WhatsApp
    if (!tenant.whatsappCancellation) {
      this.logger.log(`WhatsApp cancellation notifications are disabled for tenant ${tenant.name} (${tenant.id}). Skipping.`);
      return;
    }

    // 2. Formatear fecha y hora para el mensaje
    const dateObj = new Date(appointment.startTime);
    const tz = tenant?.timezone || 'America/Argentina/Buenos_Aires';
    const dateStr = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', timeZone: tz });
    const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: tz }) + ' hs';

    const profName = `${professional.firstName} ${professional.lastName || ''}`.trim();

    // 3. Preparar variables
    const variables = {
      clientName: client.firstName,
      professionalName: profName,
      businessName: tenant.name,
      serviceName: service?.name || 'Servicio',
      appointmentDate: dateStr,
      appointmentTime: timeStr,
      appointmentId: appointment.cancelToken || appointment.id
    };

    try {
      await this.whatsappService.sendTemplateMessage(
        appointment.tenantId,
        client.phone,
        'axenda_booking_cancellation',
        variables
      );

      this.logger.log(`WhatsApp cancellation (axenda_booking_cancellation) sent to ${client.phone} for tenant ${appointment.tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp cancellation: ${error.message}`);
    }
  }
}
