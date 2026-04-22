import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { validateConfig } from '../config/app.config'
import { PrismaModule } from '../prisma/prisma.module'
import { HttpExceptionFilter } from '../common/filters/http-exception.filter'
import { ResponseInterceptor } from '../common/interceptors/response.interceptor'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { TenantsModule } from '../tenants/tenants.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { ServicesModule } from '../services/services.module'
import { ClientsModule } from '../clients/clients.module'
import { AppointmentsModule } from '../appointments/appointments.module'

@Module({
  imports: [
    // ─── Config ─────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validate: validateConfig,
    }),

    // ─── Database ───────────────────────────────────────────────────────
    PrismaModule,

    // ─── Auth ────────────────────────────────────────────────────────────
    AuthModule,

    // ─── Domain Modules ──────────────────────────────────────────────────
    UsersModule,
    TenantsModule,
    ProfessionalsModule,
    ServicesModule,
    ClientsModule,
    AppointmentsModule,
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
export class AppModule {}
