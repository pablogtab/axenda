import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailController } from './mail.controller';

const isDevelopment = process.env.NODE_ENV === 'development';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
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
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
  controllers: isDevelopment ? [MailController] : [],
})
export class MailModule {}
