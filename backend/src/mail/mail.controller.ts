import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Get('test')
  async testEmail(@Query('to') to: string) {
    // Protección: Solo permitir este endpoint en desarrollo
    if (this.configService.get('NODE_ENV') !== 'development') {
      throw new NotFoundException();
    }

    if (!to) {
      return { error: 'Falta el parámetro "to" (ej: ?to=correo@ejemplo.com)' };
    }
    return this.mailService.sendMail({
      to,
      subject: '¡Turno Confirmado en Axenda!',
      template: 'booking-confirmation',
      context: {
        clientName: 'Pablo',
        professionalName: 'Dr. Alejandro Fernández',
        serviceName: 'Consulta Odontológica General',
        date: 'Viernes, 30 de Abril 2026',
        time: '15:30 hs',
        price: '$ 15.000',
        calendarLink: 'https://calendar.google.com/calendar/r/eventedit',
        cancelLink: 'http://localhost:4200/booking/cancel/123',
        year: new Date().getFullYear(),
      },
    });
  }
}
