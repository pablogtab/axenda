import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Cron('0 */15 * * * *')
  async handleSendReminders(now = new Date()) {
    this.logger.log('Iniciando proceso automático de envío de recordatorios de turnos...');
    
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    try {
      // 1. Buscar citas en las próximas 12 horas que no tengan recordatorio enviado
      // de negocios con recordatorios de WhatsApp activados
      const appointments = await this.prisma.appointment.findMany({
        where: {
          status: { in: ['CONFIRMED', 'PENDING'] },
          whatsappReminderSent: false,
          startTime: {
            gt: now,
            lte: twelveHoursFromNow,
          },
          tenant: {
            whatsappReminder: true,
          },
        },
        include: {
          client: true,
          professional: true,
          tenant: true,
          branch: true,
          service: true,
        },
      });

      if (appointments.length > 0) {
        this.logger.log(`Se encontraron ${appointments.length} citas potenciales para recordatorio en las próximas 12 horas.`);
      }

      for (const appointment of appointments) {
        const client = appointment.client;
        const tenant = appointment.tenant;

        if (!client || !tenant) {
          this.logger.warn(`Cita ${appointment.id} con datos incompletos (cliente o negocio faltantes). Marcando como procesada.`);
          await this.markAsSent(appointment.id);
          continue;
        }

        // 2. Verificar filtro de 1 día de antelación
        // diffInMs = startTime - createdAt
        const diffInMs = appointment.startTime.getTime() - appointment.createdAt.getTime();
        const oneDayInMs = 24 * 60 * 60 * 1000;

        if (diffInMs < oneDayInMs) {
          this.logger.log(
            `Omitiendo recordatorio para cita ${appointment.id} (creada hace menos de 1 día antes de su inicio: ${Math.round(
              diffInMs / (1000 * 60 * 60)
            )} hs).`
          );
          await this.markAsSent(appointment.id);
          continue;
        }

        // 3. Verificar si el horario de envío cae en horario silencioso (22:00 a 08:00) en la zona horaria del tenant
        const tz = tenant?.timezone || 'America/Argentina/Buenos_Aires';
        const currentHour = this.getHourInTimezone(now, tz);
        if (currentHour >= 22 || currentHour < 8) {
          this.logger.log(
            `Pospuesto recordatorio para cita ${appointment.id} por horario silencioso (${currentHour} hs en ${tz}).`
          );
          continue; // Omitimos el envío ahora, se procesará en la próxima ejecución fuera de las quiet hours
        }

        if (!client.phone) {
          this.logger.warn(`Cliente ${client.firstName} ${client.lastName || ''} no tiene teléfono en cita ${appointment.id}. Omitiendo.`);
          await this.markAsSent(appointment.id);
          continue;
        }

        // 4. Formatear datos para el mensaje de WhatsApp
        const dateObj = new Date(appointment.startTime);
        const dateStr = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', timeZone: tz });
        const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: tz }) + ' hs';

        const branchAddress = appointment.branch?.address || tenant.address || 'Dirección del negocio';
        const profName = `${appointment.professional?.firstName || ''} ${appointment.professional?.lastName || ''}`.trim();

        const variables = {
          clientName: client.firstName,
          professionalName: profName,
          businessName: tenant.name,
          serviceName: appointment.service?.name || 'Servicio',
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          branchAddress: branchAddress,
          appointmentId: appointment.cancelToken || appointment.id,
        };

        const templateName = tenant.allowReschedule
          ? 'axenda_booking_reminder'
          : 'axenda_booking_reminder_no_cancel';

        try {
          this.logger.log(`Enviando recordatorio (${templateName}) a ${client.phone} para el negocio ${tenant.name}...`);
          await this.whatsappService.sendTemplateMessage(
            appointment.tenantId,
            client.phone,
            templateName,
            variables
          );
          this.logger.log(`Recordatorio enviado con éxito para cita ${appointment.id}`);
        } catch (error) {
          this.logger.error(`Error enviando WhatsApp de recordatorio para cita ${appointment.id}: ${error.message}`);
        } finally {
          // Marcar siempre como enviado para evitar bucles de reintento/spam
          await this.markAsSent(appointment.id);
        }
      }
    } catch (error) {
      this.logger.error(`Error en el cron job de recordatorios: ${error.message}`);
    }
  }

  private getHourInTimezone(date: Date, timezone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone,
      });
      return parseInt(formatter.format(date), 10) % 24;
    } catch (e) {
      return date.getHours();
    }
  }

  private async markAsSent(appointmentId: string) {
    try {
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { whatsappReminderSent: true },
      });
    } catch (error) {
      this.logger.error(`Error marcando whatsappReminderSent para cita ${appointmentId}: ${error.message}`);
    }
  }
}
