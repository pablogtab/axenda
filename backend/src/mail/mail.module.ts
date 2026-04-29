import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailController } from './mail.controller';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: config.get('LOCAL_EMAIL') === 'true' 
          ? { jsonTransport: true } 
          : {
              host: config.get('MAIL_HOST'),
              port: Number(config.get('MAIL_PORT')),
              secure: Number(config.get('MAIL_PORT')) === 465, // true for 465, false for other ports
              auth: {
                user: config.get('MAIL_USER'),
                pass: config.get('MAIL_PASSWORD'),
              },
            },
        defaults: {
          from: config.get('MAIL_FROM', '"No Reply" <noreply@example.com>'),
        },
        template: {
          dir: process.cwd() + '/src/mail/templates',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
  controllers: [MailController],
})
export class MailModule {}
