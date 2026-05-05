import { Injectable, Logger, InternalServerErrorException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsappTemplateService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WhatsappTemplateService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v25.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const shouldSync = this.configService.get('WPP_SYNC_TEMPLATES') === 'true';
    
    if (!shouldSync) {
      this.logger.log('Sincronización de plantillas de WhatsApp desactivada por configuración (WPP_SYNC_TEMPLATES=false).');
      return;
    }

    this.logger.log('Iniciando carga y sincronización de plantillas de WhatsApp post-arranque...');
    try {
      // 1. Cargar plantillas desde archivos JSON en el FS
      await this.loadTemplatesFromFS();
      
      // 2. Sincronizar cambios de contenido con Meta
      const results = await this.syncGlobalTemplates();
      this.logger.log(`Sincronización inicial completada: ${results.created} creadas, ${results.updated} actualizadas.`);

      // 3. Revisar si hay plantillas PENDING que ya fueron aprobadas
      await this.checkPendingTemplatesStatus();
    } catch (error) {
      this.logger.error(`Fallo en el proceso inicial de WhatsApp: ${error.message}`);
    }
  }

  /**
   * Lee los archivos JSON en la carpeta 'templates' y los persiste en la DB
   */
  private async loadTemplatesFromFS() {
    const templatesDir = path.join(__dirname, 'templates');
    const defaultWabaId = this.configService.get('WPP_DEFAULT_WABA_ID')?.trim(); 
    
    if (!fs.existsSync(templatesDir)) {
      this.logger.warn(`Carpeta de plantillas no encontrada: ${templatesDir}`);
      return;
    }

    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(templatesDir, file);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const content = JSON.parse(rawContent);
        
        if (!content.name || !content.body) {
          continue;
        }

        // Upsert en la DB usando la nueva clave compuesta [name, wabaId]
        await this.prisma.whatsappTemplate.upsert({
          where: { 
            name_wabaId: { 
              name: content.name, 
              wabaId: defaultWabaId || null 
            } 
          },
          create: {
            name: content.name,
            wabaId: defaultWabaId || null,
            category: content.category || 'UTILITY',
            language: content.language || 'es_AR',
            body: content.body,
            tenantId: null,
            status: 'PENDING'
          },
          update: {
            category: content.category || 'UTILITY',
            language: content.language || 'es_AR',
            body: content.body
          }
        });
      } catch (error) {
        this.logger.error(`Error procesando archivo de plantilla ${file}: ${error.message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCronSync() {
    const shouldSync = this.configService.get('WPP_SYNC_TEMPLATES') === 'true';
    if (!shouldSync) return;

    try {
      await this.syncGlobalTemplates();
    } catch (error) {
      this.logger.error(`Error en cron de sincronización de WhatsApp: ${error.message}`);
    }
  }

  /**
   * Cron job cada 5 minutos para revisar aprobaciones pendientes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePendingTemplatesCheck() {
    const shouldSync = this.configService.get('WPP_SYNC_TEMPLATES') === 'true';
    if (!shouldSync) return;

    try {
      await this.checkPendingTemplatesStatus();
    } catch (error) {
      this.logger.error(`Error revisando plantillas PENDING: ${error.message}`);
    }
  }

  /**
   * Busca plantillas con estado PENDING en la DB y actualiza su estado si ya cambió en Meta
   */
  async checkPendingTemplatesStatus() {
    const pendingTemplates = await this.prisma.whatsappTemplate.findMany({
      where: { status: 'PENDING' },
    });

    if (pendingTemplates.length === 0) return;

    const wabaId = this.configService.get('WPP_DEFAULT_WABA_ID')?.trim();
    const accessToken = this.configService.get('WPP_DEFAULT_ACCESS_TOKEN');

    if (!wabaId || !accessToken) return;

    const metaTemplates = await this.getMetaTemplates(wabaId, accessToken);

    for (const dbTemplate of pendingTemplates) {
      const metaTemplate = metaTemplates.find(t => t.name === dbTemplate.name);
      if (metaTemplate && metaTemplate.status !== dbTemplate.status) {
        await this.prisma.whatsappTemplate.update({
          where: { id: dbTemplate.id },
          data: { status: metaTemplate.status },
        });
        this.logger.log(`Plantilla ${dbTemplate.name} sincronizada: ${dbTemplate.status} -> ${metaTemplate.status}`);
      }
    }
  }

  /**
   * Sincroniza las plantillas globales de Axenda con la plataforma de Meta
   */
  async syncGlobalTemplates() {
    const wabaId = this.configService.get('WPP_DEFAULT_WABA_ID')?.trim();
    const accessToken = this.configService.get('WPP_DEFAULT_ACCESS_TOKEN');

    if (!wabaId || !accessToken) {
      throw new InternalServerErrorException('WABA ID o Access Token por defecto no configurados.');
    }

    // Obtener plantillas globales de la DB
    const dbTemplates = await this.prisma.whatsappTemplate.findMany({
      where: { tenantId: null, wabaId: wabaId },
    });

    const metaTemplates = await this.getMetaTemplates(wabaId, accessToken);

    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const dbTemplate of dbTemplates) {
      const metaTemplate = metaTemplates.find(t => t.name === dbTemplate.name);

      try {
        if (!metaTemplate) {
          await this.createMetaTemplate(wabaId, accessToken, dbTemplate);
          results.created++;
        } else {
          const hasChanges = this.checkTemplateChanges(dbTemplate, metaTemplate);

          if (hasChanges) {
            if (['APPROVED', 'REJECTED', 'PAUSED'].includes(metaTemplate.status)) {
              await this.editMetaTemplate(metaTemplate.id, accessToken, dbTemplate);
            } else {
              await this.deleteMetaTemplate(wabaId, accessToken, dbTemplate.name);
              await this.createMetaTemplate(wabaId, accessToken, dbTemplate);
            }
            results.updated++;
          } else if (dbTemplate.status !== metaTemplate.status) {
            await this.prisma.whatsappTemplate.update({
              where: { id: dbTemplate.id },
              data: { status: metaTemplate.status },
            });
            results.updated++;
          }
        }
      } catch (error) {
        const errorData = error.response?.data?.error;
        const errorMsg = errorData?.message || error.message;
        this.logger.error(`Error sincronizando plantilla ${dbTemplate.name}: ${errorMsg}`, errorData);
        results.errors.push({ name: dbTemplate.name, error: errorMsg });
      }
    }

    return results;
  }

  private checkTemplateChanges(dbTemplate: any, metaTemplate: any): boolean {
    if (dbTemplate.category !== metaTemplate.category) return true;

    let varCount = 0;
    const dbMetaBody = dbTemplate.body.replace(/{{(\w+)}}/g, () => {
      varCount++;
      return `{{${varCount}}}`;
    });

    const metaBody = metaTemplate.components.find(c => c.type === 'BODY')?.text;
    return dbMetaBody !== metaBody;
  }

  private async getMetaTemplates(wabaId: string, accessToken: string) {
    const response = await axios.get(`${this.baseUrl}/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data.data;
  }

  private prepareComponents(templateBody: string) {
    let varCount = 0;
    const examples: string[] = [];
    const metaBody = templateBody.replace(/{{(\w+)}}/g, (match, varName) => {
      varCount++;
      examples.push(`[${varName}]`); 
      return `{{${varCount}}}`;
    });

    const bodyComponent: any = {
      type: 'BODY',
      text: metaBody,
    };

    if (varCount > 0) {
      bodyComponent.example = {
        body_text: [examples]
      };
    }

    return [bodyComponent];
  }

  private async createMetaTemplate(wabaId: string, accessToken: string, template: any) {
    const components = this.prepareComponents(template.body);

    const payload = {
      name: template.name,
      category: template.category,
      language: template.language,
      components,
    };

    const response = await axios.post(
      `${this.baseUrl}/${wabaId}/message_templates`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    await this.prisma.whatsappTemplate.update({
      where: { id: template.id },
      data: { status: 'PENDING' },
    });

    return response.data;
  }

  private async editMetaTemplate(templateId: string, accessToken: string, template: any) {
    const components = this.prepareComponents(template.body);

    const payload = {
      components,
    };

    const response = await axios.post(
      `${this.baseUrl}/${templateId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  private async deleteMetaTemplate(wabaId: string, accessToken: string, templateName: string) {
    try {
      await axios.delete(
        `${this.baseUrl}/${wabaId}/message_templates`,
        {
          params: { name: templateName },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error) {
      this.logger.warn(`Error al intentar borrar plantilla ${templateName}: ${error.message}`);
    }
  }
}
