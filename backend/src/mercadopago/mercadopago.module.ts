import { Global, Module } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';

@Global()
@Module({
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
