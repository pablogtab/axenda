import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app/app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = new Logger('Bootstrap')

  // ─── Global Prefix ──────────────────────────────────────────────────
  app.setGlobalPrefix('api')

  // ─── CORS ───────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env['NODE_ENV'] === 'production' 
      ? (process.env['FRONTEND_URL'] ?? 'http://localhost:4200')
      : true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  })

  // ─── Global Validation Pipe ─────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip unknown properties
      forbidNonWhitelisted: true,   // Throw on unknown properties
      transform: true,              // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // ─── Swagger (development only) ─────────────────────────────────────
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Axenda API')
      .setDescription('Gestor de agenda para profesionales y empresas')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    })

    logger.log('📚 Swagger docs available at: http://localhost:3000/api/docs')
  }

  // ─── Graceful Shutdown ──────────────────────────────────────────────
  app.enableShutdownHooks()

  const port = process.env['PORT'] ?? 3000
  await app.listen(port, '0.0.0.0')

  logger.log(`🚀 API running at: http://localhost:${port}/api`)

  // ─── Global Error Handlers (Evitar reinicios por errores no capturados) ───
  process.on('uncaughtException', (err) => {
    logger.error(`Excepción no capturada (uncaughtException): ${err.message}`, err.stack)
    // No salimos del proceso para evitar que el servicio de Nest se reinicie
  })

  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Promesa rechazada no manejada (unhandledRejection): ${reason}`)
  })
}

bootstrap()
