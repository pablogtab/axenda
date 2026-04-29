import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { EventEmitterModule } from '@nestjs/event-emitter'
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
