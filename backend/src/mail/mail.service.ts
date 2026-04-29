import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendTestEmail(to: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: '¡Prueba de Resend desde Axenda!',
        html: `
          <h3>Hola,</h3>
          <p>Este es un correo de prueba usando Resend y Nodemailer en NestJS.</p>
          <p>Si estás leyendo esto, ¡la configuración funciona perfectamente!</p>
          <br>
          <p>Saludos,<br>El equipo de Axenda.</p>
        `,
      });
      this.logger.log(`Correo de prueba enviado correctamente a ${to}`);
      return { success: true, message: 'Correo enviado' };
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}`, error);
      throw error;
    }
  }
}
