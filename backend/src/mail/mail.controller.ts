import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) { }

  @Get('test/booking-confirmed')
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

  @Get('test/tenant-booking')
  async testTenantBookingEmail(@Query('to') to: string) {
    if (this.configService.get('NODE_ENV') !== 'development') {
      throw new NotFoundException();
    }
    if (!to) return { error: 'Falta el parámetro "to" (ej: ?to=correo@ejemplo.com)' };

    return this.mailService.sendMail({
      to,
      subject: '¡Nuevo Turno Agendado!',
      template: 'tenant-booking-notification',
      context: {
        businessName: 'Barbería Vintage',
        clientName: 'Juan Pérez',
        serviceName: 'Corte de Cabello y Barba',
        date: 'Lunes, 3 de Mayo 2026',
        time: '17:00 hs',
        professionalName: 'Carlos Gómez',
        dashboardLink: 'http://localhost:4200/dashboard/agenda',
        year: new Date().getFullYear(),
      },
    });
  }

  @Get('test/welcome')
  async testWelcomeEmail(@Query('to') to: string) {
    if (this.configService.get('NODE_ENV') !== 'development') {
      throw new NotFoundException();
    }
    if (!to) return { error: 'Falta el parámetro "to" (ej: ?to=correo@ejemplo.com)' };

    return this.mailService.sendMail({
      to,
      subject: '¡Bienvenido a Axenda!',
      template: 'welcome-new-account',
      context: {
        ownerName: 'María López',
        businessName: 'Spa Relax',
        dashboardLink: 'http://localhost:4200/dashboard/settings',
        year: new Date().getFullYear(),
      },
    });
  }

  @Get('test/password-recovery')
  async testPasswordRecoveryEmail(@Query('to') to: string) {
    if (this.configService.get('NODE_ENV') !== 'development') {
      throw new NotFoundException();
    }
    if (!to) return { error: 'Falta el parámetro "to" (ej: ?to=correo@ejemplo.com)' };

    return this.mailService.sendMail({
      to,
      subject: 'Recuperación de Contraseña',
      template: 'password-recovery',
      context: {
        userName: 'María López',
        recoveryLink: 'http://localhost:4200/login?reset=token12345',
        year: new Date().getFullYear(),
      },
    });
  }
}
