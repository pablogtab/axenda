import { Controller, Post, Req, Res, Body, Logger, Headers, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';

import { ConfigService } from '@nestjs/config';

@Controller('webhooks/mercadopago')
export class MercadoPagoWebhooksController {
  private readonly logger = new Logger(MercadoPagoWebhooksController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mercadopagoService: MercadoPagoService,
    private readonly configService: ConfigService
  ) { }

  @Post()
  async handleWebhook(
    @Body() body: any,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    this.logger.log('Recibido webhook de Mercado Pago');

    // ─── Validación de Firma ───────────────────────────────────────────
    if (xSignature) {
      try {
        // Usamos el secreto específico de webhooks configurado en el panel de MP
        const secret = this.configService.get('MP_WEBHOOK_SECRET_KEY') ||
          this.configService.get('MP_WEBHOOK_SECRET') ||
          this.configService.get('MP_ACCESS_TOKEN');
        const parts = xSignature.split(',');
        let ts: string | undefined;
        let v1: string | undefined;

        parts.forEach(part => {
          const [key, value] = part.split('=');
          if (key === 'ts') ts = value;
          if (key === 'v1') v1 = value;
        });

        if (ts && v1 && secret) {
          // El data.id puede venir en el body o en el query
          const dataIdForManifest = (body.data?.id || req.query['data.id'] || req.query['id'] || '').toString();

          // Construcción del manifest según documentación oficial de MP V2
          // Importante: El orden y los separadores son críticos
          const manifest = `id:${dataIdForManifest};request-id:${xRequestId};ts:${ts};`;

          const calculatedHash = crypto
            .createHmac('sha256', secret)
            .update(manifest)
            .digest('hex');

          if (calculatedHash !== v1) {
            this.logger.warn(`Firma de webhook INVÁLIDA. Manifest: ${manifest}`);
            if (this.configService.get('NODE_ENV') === 'production') {
              return res.status(401).send('Invalid signature');
            }
          } else {
            this.logger.log('Firma de webhook verificada correctamente.');
          }
        }
      } catch (err) {
        this.logger.error('Error validando firma de MP', err);
      }
    } else {
      this.logger.warn('Webhook recibido SIN FIRMA x-signature.');
      if (this.configService.get('NODE_ENV') === 'production') {
        return res.status(401).send('Invalid signature');
      }
    }
    // ───────────────────────────────────────────────────────────────────

    this.logger.debug('Body:', JSON.stringify(body));
    this.logger.debug('Query:', JSON.stringify(req.query));

    // MP requiere que respondamos 200 OK inmediatamente
    res.status(200).send('OK');

    try {
      // Extraemos los datos combinando Body y Query (algunos avisos de MP vienen por Query)
      const type = body.type || body.topic || req.query['type'] || req.query['topic'];

      // Manejo de data.id que puede venir como objeto o como string en query 'data.id'
      const dataId = body.data?.id || req.query['data.id'] || req.query['id'];

      if (!type || !dataId) {
        this.logger.warn(`Webhook incompleto. Type: ${type}, DataId: ${dataId}`);
        return;
      }

      this.logger.log(`Procesando evento: ${type} para ID: ${dataId}`);

      switch (type) {
        case 'subscription_preapproval':
          await this.handleSubscriptionUpdate(dataId as string);
          break;
        case 'payment':
        case 'subscription_authorized_payment':
          await this.handlePaymentUpdate(dataId as string);
          break;
        default:
          this.logger.debug(`Evento no manejado o ignorado: ${type}`);
      }
    } catch (error) {
      this.logger.error('Error procesando webhook', error);
    }
  }

  private async handleSubscriptionUpdate(subscriptionId: string) {
    this.logger.log(`Procesando actualización de suscripción: ${subscriptionId}`);
    try {
      const subscription = await this.mercadopagoService.getSubscription(subscriptionId);
      await this.subscriptionsService.handleMercadoPagoSubscriptionUpdate(subscription);
    } catch (error) {
      this.logger.error(`Error al obtener info de suscripción ${subscriptionId}`, error);
    }
  }

  private async handlePaymentUpdate(paymentId: string) {
    this.logger.log(`Procesando pago: ${paymentId}`);
    try {
      const payment = await this.mercadopagoService.getPayment(paymentId);
      await this.subscriptionsService.handleMercadoPagoPayment(payment);
    } catch (error) {
      this.logger.error(`Error al obtener info del pago ${paymentId}`, error);
    }
  }
}
