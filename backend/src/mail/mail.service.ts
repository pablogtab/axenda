import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendMail(options: { to: string; subject: string; html: string }) {
    const isLocal = this.configService.get('LOCAL_EMAIL') === 'true';

    // Generamos un hash único basado en el destinatario, asunto y contenido
    // Esto evita que enviemos exactamente el mismo correo 2 veces por error.
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(options.to + options.subject + options.html)
      .digest('hex');

    if (isLocal) {
      this.logger.log(`[EMULACIÓN LOCAL] Guardando correo para: ${options.to}`);
      
      const sentEmailsDir = path.join(process.cwd(), 'sent_emails', options.to);
      if (!fs.existsSync(sentEmailsDir)) {
        fs.mkdirSync(sentEmailsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(sentEmailsDir, `${timestamp}.html`);
      
      const fileContent = `
        <!-- ASUNTO: ${options.subject} -->
        <!-- DESTINATARIO: ${options.to} -->
        <!-- IDEMPOTENCY KEY: ${idempotencyKey} -->
        <hr />
        ${options.html}
      `;

      fs.writeFileSync(filePath, fileContent);
      this.logger.log(`[EMULACIÓN LOCAL] Correo guardado en: ${filePath}`);
      return { success: true, local: true, filePath, idempotencyKey };
    }

    // Si no es local, enviamos con el proveedor real
    try {
      await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        html: options.html,
        headers: {
          'Resend-Idempotency-Key': idempotencyKey,
        },
      });
      this.logger.log(`Correo real enviado a ${options.to}`);
      return { success: true, local: false, idempotencyKey };
    } catch (error) {
      this.logger.error(`Error enviando correo a ${options.to}`, error);
      throw error;
    }
  }

  async sendTestEmail(to: string) {
    return this.sendMail({
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
  }
}

