import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, PreApprovalPlan, PreApproval, Payment, Preference } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN no configurado en el .env');
    }

    this.client = new MercadoPagoConfig({
      accessToken: accessToken || '',
      options: { timeout: 5000 }
    });
  }

  /**
   * Crea un plan de suscripción en Mercado Pago
   */
  async createPlan(data: {
    reason: string;
    amount: number;
    frequency: number;
    frequency_type: 'days' | 'months' | 'years';
    back_url: string;
  }) {
    const plan = new PreApprovalPlan(this.client);

    try {
      const response = await plan.create({
        body: {
          reason: data.reason,
          auto_recurring: {
            frequency: data.frequency,
            frequency_type: data.frequency_type,
            transaction_amount: data.amount,
            currency_id: 'ARS',
          },
          back_url: data.back_url,
          status: 'active',
        },
      });
      return response;
    } catch (error) {
      this.logger.error('Error al crear plan en Mercado Pago', error);
      throw error;
    }
  }

  /**
   * Obtiene los detalles de un plan de suscripción
   */
  async getPlan(planId: string) {
    const plan = new PreApprovalPlan(this.client);
    try {
      return await plan.get({ preApprovalPlanId: planId });
    } catch (error) {
      this.logger.error(`Error al obtener plan ${planId} de Mercado Pago`, error);
      throw error;
    }
  }

  /**
   * Genera un link de suscripción para un cliente
   */
  async createSubscription(data: {
    planId: string;
    payerEmail: string;
    backUrl: string;
    reason: string;
    externalReference?: string;
  }) {
    const preApproval = new PreApproval(this.client);

    try {
      const response = await preApproval.create({
        body: {
          preapproval_plan_id: data.planId,
          reason: data.reason,
          payer_email: data.payerEmail,
          back_url: data.backUrl,
          external_reference: data.externalReference,
        },
      });
      return response;
    } catch (error) {
      this.logger.error('Error al crear suscripción en Mercado Pago', error);
      throw error;
    }
  }

  /**
   * Crea una preferencia de pago para un pago único (Manual)
   */
  async createPreference(data: {
    title: string;
    amount: number;
    quantity: number;
    externalReference: string;
    backUrl: string;
    payerEmail: string;
  }) {
    try {
      this.logger.log(`Creando preferencia de pago para: ${data.title}. URL: ${data.backUrl}`);
      
      const preference = new Preference(this.client);
      const body = {
        items: [
          {
            id: 'subscription-payment',
            title: data.title,
            quantity: data.quantity,
            unit_price: data.amount,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: data.payerEmail,
        },
        external_reference: data.externalReference,
        back_urls: {
          success: data.backUrl,
          pending: data.backUrl,
          failure: data.backUrl,
        },
        auto_return: 'approved',
        notification_url: this.configService.get('MP_WEBHOOK_BASE_URL') 
          ? `${this.configService.get('MP_WEBHOOK_BASE_URL')}/api/webhooks/mercadopago`
          : undefined,
      };

      const result = await preference.create({ body });
      return result;
    } catch (error) {
      this.logger.error('Error al crear preferencia en Mercado Pago', error);
      if (error.response) {
        this.logger.error('Respuesta detallada de MP:', JSON.stringify(error.response));
      }
      throw error;
    }
  }

  /**
   * Obtiene detalles de un pago (usado en webhooks)
   */
  async getPayment(paymentId: string) {
    const payment = new Payment(this.client);
    try {
      return await payment.get({ id: paymentId });
    } catch (error) {
      this.logger.error(`Error al obtener pago ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de una suscripción
   */
  async getSubscription(subscriptionId: string) {
    const preApproval = new PreApproval(this.client);
    try {
      return await preApproval.get({ id: subscriptionId });
    } catch (error) {
      this.logger.error(`Error al obtener suscripción ${subscriptionId}`, error);
      throw error;
    }
  }
}
