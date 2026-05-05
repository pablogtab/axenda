import { Injectable, Logger, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
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
    return this.prisma.tenantWhatsappConfig.findUnique({
      where: { tenantId },
    });
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
    const components = [
      {
        type: 'body',
        parameters: varMatches.map(match => ({
          type: 'text',
          text: variables[match[1]] || '',
        })),
      },
    ];

    // 3. Obtener configuración de envío (Propia o Fallback a Axenda)
    const config = await this.getTenantWhatsappConfig(tenantId);
    const phoneId = config?.verified ? config.phoneId : this.configService.get('WPP_DEFAULT_PHONE_ID');
    const accessToken = config?.verified ? config.accessToken : this.configService.get('WPP_DEFAULT_ACCESS_TOKEN');

    if (!phoneId || !accessToken) {
      throw new NotFoundException('WhatsApp no está configurado para este negocio.');
    }

    const cleanPhone = to.replace(/\D/g, '');

    try {
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

      // 4. Registrar logs y actualizar contadores
      await this.prisma.whatsappMessageLog.create({
        data: {
          tenantId,
          phoneNumber: cleanPhone,
          templateId: template.name,
          status: 'SENT',
          metaMessageId: response.data.messages[0].id,
        },
      });

      await this.prisma.tenantWhatsappConfig.upsert({
        where: { tenantId },
        create: { tenantId, messagesSentMonth: 1 },
        update: { messagesSentMonth: { increment: 1 } },
      });

      return response.data;
    } catch (error) {
      const errorData = error.response?.data;
      this.logger.error(`Error sending WhatsApp message: ${error.message}`, errorData);
      
      await this.prisma.whatsappMessageLog.create({
        data: {
          tenantId,
          phoneNumber: cleanPhone,
          templateId: template.name,
          status: 'FAILED',
        },
      });
      
      throw new InternalServerErrorException(
        errorData?.error?.message || 'Error enviando mensaje de WhatsApp'
      );
    }
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
