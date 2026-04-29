import { Controller, Get, Query } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('test')
  async testEmail(@Query('to') to: string) {
    if (!to) {
      return { error: 'Falta el parámetro "to" (ej: ?to=correo@ejemplo.com)' };
    }
    return this.mailService.sendTestEmail(to);
  }
}
