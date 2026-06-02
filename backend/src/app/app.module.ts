import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { validateConfig } from '../config/app.config'
import { PrismaModule } from '../prisma/prisma.module'
import { HttpExceptionFilter } from '../common/filters/http-exception.filter'
import { ResponseInterceptor } from '../common/interceptors/response.interceptor'
import { LoggerMiddleware } from '../common/middleware/logger.middleware'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { TenantsModule } from '../tenants/tenants.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { ServicesModule } from '../services/services.module'
import { ClientsModule } from '../clients/clients.module'
import { AppointmentsModule } from '../appointments/appointments.module'
import { StorageModule } from '../common/storage/storage.module'
import { MailModule } from '../mail/mail.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { MercadoPagoModule } from '../mercadopago/mercadopago.module'
import { CustomFieldsModule } from '../custom-fields/custom-fields.module'
import { AdminModule } from '../admin/admin.module'
import { BookingInvitationsModule } from '../booking-invitations/booking-invitations.module'

@Module({
  imports: [
    // ─── Config ─────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateConfig,
    }),

    // ─── Static Files ───────────────────────────────────────────────────
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // ─── Database ───────────────────────────────────────────────────────
    PrismaModule,

    // ─── Shared Modules ──────────────────────────────────────────────────
    StorageModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    // ─── Auth ────────────────────────────────────────────────────────────
    AuthModule,

    // ─── Domain Modules ──────────────────────────────────────────────────
    UsersModule,
    TenantsModule,
    ProfessionalsModule,
    ServicesModule,
    ClientsModule,
    AppointmentsModule,
    MailModule,
    SubscriptionsModule,
    WhatsappModule,
    MercadoPagoModule,
    CustomFieldsModule,
    AdminModule,
    BookingInvitationsModule,
  ],

  providers: [
    // ─── Global Exception Filter ─────────────────────────────────────────
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // ─── Global Response Interceptor ────────────────────────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
