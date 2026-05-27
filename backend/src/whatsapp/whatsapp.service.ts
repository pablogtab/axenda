import { Injectable, Logger, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PhoneUtils } from '../common/utils/phone-utils';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v25.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtiene la configuración de WhatsApp para un tenant
   */
  async getTenantWhatsappConfig(tenantId: string) {
    let config = await this.prisma.tenantWhatsappConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      config = await this.prisma.tenantWhatsappConfig.create({
        data: {
          tenantId,
          verified: false,
          messagesSentMonth: 0,
          lastResetDate: new Date(),
        },
      });
    } else {
      const now = new Date();
      const lastReset = new Date(config.lastResetDate);
      const nextReset = new Date(lastReset);
      nextReset.setMonth(nextReset.getMonth() + 1);

      if (now >= nextReset) {
        let newResetDate = nextReset;
        while (true) {
          const nextMonth = new Date(newResetDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          if (now < nextMonth) {
            break;
          }
          newResetDate = nextMonth;
        }

        this.logger.log(`Reseteando uso mensual de WhatsApp para el tenant ${tenantId}. Próximo reinicio: ${newResetDate.toISOString()}`);

        config = await this.prisma.tenantWhatsappConfig.update({
          where: { tenantId },
          data: {
            messagesSentMonth: 0,
            lastResetDate: newResetDate,
          },
        });
      }
    }

    return config;
  }

  /**
   * Actualiza o crea la configuración de WhatsApp
   */
  async updateConfig(tenantId: string, data: any) {
    return this.prisma.tenantWhatsappConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Determina qué plantilla usar (si la global de Axenda o una personalizada que la reemplace)
   * Solo devuelve plantillas con estado 'APPROVED'
   */
  private async resolveTemplate(tenantId: string, templateName: string) {
    const config = await this.getTenantWhatsappConfig(tenantId);
    
    // Si el tenant tiene su propia cuenta verificada, buscamos si tiene un reemplazo aprobado
    if (config?.verified && config.wabaId) {
      const customTemplate = await this.prisma.whatsappTemplate.findFirst({
        where: {
          tenantId,
          replaces: templateName,
          status: 'APPROVED'
        }
      });

      if (customTemplate) {
        this.logger.log(`Usando plantilla personalizada '${customTemplate.name}' para el tenant ${tenantId} (reemplaza a ${templateName})`);
        return customTemplate;
      }
    }

    // Si no hay reemplazo o no tiene cuenta propia, buscamos la global de Axenda que esté APROBADA
    const globalTemplate = await this.prisma.whatsappTemplate.findFirst({
      where: { 
        name: templateName, 
        tenantId: null,
        status: 'APPROVED'
      }
    });

    return globalTemplate;
  }

  /**
   * Envía un mensaje de plantilla (Template) usando variables nombradas
   */
  async sendTemplateMessage(
    tenantId: string,
    to: string,
    templateName: string,
    variables: Record<string, string> = {},
    languageCode: string = 'es_AR'
  ) {
    // 1. Validar suscripción y límites
    await this.subscriptionsService.validateLimit(tenantId, 'WHATSAPP');

    // 2. Resolver cuál es la plantilla efectiva (Global o Reemplazo personalizado)
    const template = await this.resolveTemplate(tenantId, templateName);

    if (!template) {
      this.logger.warn(`Template ${templateName} not found or not APPROVED for tenant ${tenantId}.`);
      throw new BadRequestException(
        `La plantilla '${templateName}' no está disponible o no ha sido aprobada por Meta todavía.`
      );
    }

    // Extraer las variables en el orden exacto que aparecen en el body
    const varMatches = [...template.body.matchAll(/{{(\w+)}}/g)];
    const components: any[] = [
      {
        type: 'body',
        parameters: varMatches.map(match => ({
          type: 'text',
          text: variables[match[1]] || '',
        })),
      },
    ];

    // Check if the template has URL buttons
    const buttons = template.buttons as any[];
    if (buttons && Array.isArray(buttons) && buttons.length > 0) {
      buttons.forEach((btn, index) => {
        if (btn.type === 'URL') {
          // If the button has url parameters, extract them
          const btnVarMatches = [...btn.url.matchAll(/{{(\w+)}}/g)];
          if (btnVarMatches.length > 0) {
            components.push({
              type: 'button',
              sub_type: 'url',
              index: String(index),
              parameters: btnVarMatches.map(match => ({
                type: 'text',
                text: variables[match[1]] || '',
              })),
            });
          }
        }
      });
    }

    // 3. Obtener configuración de envío (Propia o Fallback a Axenda)
    const config = await this.getTenantWhatsappConfig(tenantId);
    const phoneId = config?.verified ? config.phoneId : this.configService.get('WPP_DEFAULT_PHONE_ID');
    const accessToken = config?.verified ? config.accessToken : this.configService.get('WPP_DEFAULT_ACCESS_TOKEN');

    const realSend = this.configService.get('WPP_REAL_SEND') === 'true';

    if (realSend && (!phoneId || !accessToken)) {
      throw new NotFoundException('WhatsApp no está configurado para este negocio.');
    }

    // Normalizar el número de teléfono usando PhoneUtils
    const cleanPhone = PhoneUtils.normalize(to);

    if (!cleanPhone) {
      throw new BadRequestException('El número de teléfono del cliente no es válido.');
    }

    // Reconstruir el texto del cuerpo del mensaje con sus variables reales
    let bodyText = template.body;
    for (const [key, val] of Object.entries(variables)) {
      bodyText = bodyText.split(`{{${key}}}`).join(val);
    }

    try {
      let responseData: any;
      if (realSend) {
        const response = await axios.post(
          `${this.baseUrl}/${phoneId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'template',
            template: {
              name: template.name,
              language: { code: template.language },
              components,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        );
        responseData = response.data;
      } else {
        this.logger.log(`[MOCK WHATSAPP] Enviando mensaje a ${cleanPhone} usando plantilla ${template.name}`);
        this.logger.log(`[MOCK WHATSAPP] Cuerpo: ${bodyText}`);
        responseData = {
          messages: [{ id: `wamid.mocked_${Date.now()}` }]
        };
      }

      // 4. Registrar logs y actualizar contadores
      await this.prisma.whatsappMessageLog.create({
        data: {
          tenantId,
          phoneNumber: cleanPhone,
          templateId: template.name,
          status: 'SENT',
          body: bodyText,
          metaMessageId: responseData.messages[0].id,
        },
      });

      // Descontar saldo extra de paquetes comprados si excede el límite del plan mensual (FIFO)
      try {
        const subscription = await this.prisma.tenantSubscription.findUnique({
          where: { tenantId },
          include: { plan: true },
        });
        const maxWhatsapp = subscription?.plan?.maxWhatsapp || 0;

        const wConfig = await this.prisma.tenantWhatsappConfig.findUnique({
          where: { tenantId }
        });
        const messagesSentMonth = wConfig ? wConfig.messagesSentMonth : 0;

        if (messagesSentMonth >= maxWhatsapp) {
          const soonestPack = await this.prisma.tenantWhatsappPack.findFirst({
            where: {
              tenantId,
              remaining: { gt: 0 },
              expiresAt: { gt: new Date() }
            },
            orderBy: { expiresAt: 'asc' }
          });

          if (soonestPack) {
            await this.prisma.tenantWhatsappPack.update({
              where: { id: soonestPack.id },
              data: { remaining: { decrement: 1 } }
            });
            this.logger.log(`Discounted 1 WhatsApp message from pack ${soonestPack.id} (remaining: ${soonestPack.remaining - 1}) for tenant ${tenantId}.`);
          }
        }
      } catch (err) {
        // Log error but don't fail message delivery
        this.logger.error(`Error processing WhatsApp pack FIFO consumption: ${err.message}`);
      }

      await this.prisma.tenantWhatsappConfig.upsert({
        where: { tenantId },
        create: { tenantId, messagesSentMonth: 1 },
        update: { messagesSentMonth: { increment: 1 } },
      });

      return responseData;
    } catch (error) {
      const errorData = error.response?.data;
      this.logger.error(`Error sending WhatsApp message: ${error.message}`, errorData);
      
      await this.prisma.whatsappMessageLog.create({
        data: {
          tenantId,
          phoneNumber: cleanPhone,
          templateId: template.name,
          status: 'FAILED',
          body: bodyText,
        },
      });
      
      throw new InternalServerErrorException(
        errorData?.error?.message || 'Error enviando mensaje de WhatsApp'
      );
    }
  }

  /**
   * Obtiene las plantillas de WhatsApp (globales de Axenda y/o personalizadas del tenant)
   */
  async getTemplates(tenantId: string) {
    return this.prisma.whatsappTemplate.findMany({
      where: {
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Intercambia el código de Embedded Signup por un token de acceso
   */
  async exchangeCodeForToken(tenantId: string, code: string) {
    // TODO: Implementar intercambio con la API de Meta
    this.logger.log(`Exchanging code for tenant ${tenantId}`);
    return { success: true };
  }
}
