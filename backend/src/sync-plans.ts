import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SubscriptionsService } from './subscriptions/subscriptions.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const subscriptionsService = app.get(SubscriptionsService);
  
  console.log('Iniciando script de sincronización...');
  try {
    const result = await subscriptionsService.syncPlansWithMercadoPago();
    console.log('Resultado:', result);
  } catch (e) {
    console.error('Error:', e);
  }
  
  await app.close();
}

bootstrap();
