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

  async sendMail(options: { to: string; subject: string; template?: string; context?: any; html?: string }) {
    const isLocal = this.configService.get('LOCAL_EMAIL') === 'true';

    // Para la idempotencia, usamos el contexto y la plantilla si existen, o el HTML
    const contentString = options.template 
      ? options.template + JSON.stringify(options.context || {})
      : (options.html || '');

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(options.to + options.subject + contentString)
      .digest('hex');

    try {
      // Enviamos el correo (si estamos en local, el transport de nodemailer 
      // debería estar interceptándolo, o lo manejamos después)
      const info = await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context,
        html: options.html,
        headers: {
          'Resend-Idempotency-Key': idempotencyKey,
        },
      });

      // Si es local y usamos jsonTransport, info.message contiene el JSON con el HTML compilado
      if (isLocal && info.message) {
        this.logger.log(`[EMULACIÓN LOCAL] Guardando correo para: ${options.to}`);
        
        const sentEmailsDir = path.join(process.cwd(), 'sent_emails', options.to);
        if (!fs.existsSync(sentEmailsDir)) {
          fs.mkdirSync(sentEmailsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = path.join(sentEmailsDir, `${timestamp}.html`);
        
        // Nodemailer jsonTransport devuelve un string JSON en info.message
        const emailData = JSON.parse(info.message);
        
        const fileContent = `
          <!-- ASUNTO: ${options.subject} -->
          <!-- DESTINATARIO: ${options.to} -->
          <!-- IDEMPOTENCY KEY: ${idempotencyKey} -->
          <hr />
          ${emailData.html || options.html || '<p>No HTML content</p>'}
        `;

        fs.writeFileSync(filePath, fileContent);
        this.logger.log(`[EMULACIÓN LOCAL] Correo guardado en: ${filePath}`);
        return { success: true, local: true, filePath, idempotencyKey };
      }

      this.logger.log(`Correo real enviado a ${options.to}`);
      return { success: true, local: false, idempotencyKey };
    } catch (error) {
      this.logger.error(`Error enviando correo a ${options.to}`, error);
      throw error;
    }
  }
}

