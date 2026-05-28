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
    // 1. Siempre cargar plantillas desde archivos JSON del FS a la DB local
    try {
      await this.loadTemplatesFromFS();
      this.logger.log('Plantillas de WhatsApp cargadas localmente en la base de datos.');
    } catch (error) {
      this.logger.error(`Error cargando plantillas locales de WhatsApp: ${error.message}`);
    }

    // Si estamos en entorno de test, nunca sincronizar con Meta ni iniciar crons
    if (process.env['NODE_ENV'] === 'test') {
      return;
    }

    const shouldSync = this.configService.get('WPP_SYNC_TEMPLATES') === 'true';
    
    if (!shouldSync) {
      this.logger.log('Sincronización de plantillas de WhatsApp desactivada por configuración (WPP_SYNC_TEMPLATES=false).');
      return;
    }

    const wabaId = this.configService.get('WPP_DEFAULT_WABA_ID')?.trim();
    const accessToken = this.configService.get('WPP_DEFAULT_ACCESS_TOKEN');

    if (!wabaId || !accessToken) {
      this.logger.warn('WhatsApp no está configurado correctamente (WPP_DEFAULT_WABA_ID o WPP_DEFAULT_ACCESS_TOKEN faltantes). Se omitirá la sincronización.');
      return;
    }

    this.logger.log('Iniciando sincronización de plantillas de WhatsApp con Meta post-arranque...');
    try {
      // 2. Sincronizar cambios de contenido con Meta
      const results = await this.syncGlobalTemplates();
      if (results) {
        this.logger.log(`Sincronización inicial completada con Meta: ${results.created} creadas, ${results.updated} actualizadas.`);
      }

      // 3. Revisar si hay plantillas PENDING que ya fueron aprobadas
      await this.checkPendingTemplatesStatus();
    } catch (error) {
      this.logger.error(`Fallo en el proceso de sincronización con Meta: ${error.message}`);
    }
  }

  private async loadTemplatesFromFS() {
    const templatesDir = path.join(__dirname, 'templates');
    const defaultWabaId = this.configService.get('WPP_DEFAULT_WABA_ID')?.trim() || null; 

    if (!fs.existsSync(templatesDir)) {
      this.logger.warn(`Carpeta de plantillas no encontrada: ${templatesDir}`);
      return;
    }

    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    const loadedNames: string[] = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(templatesDir, file);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const content = JSON.parse(rawContent);
        
        if (!content.name || !content.body) {
          continue;
        }

        loadedNames.push(content.name);

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
            buttons: content.buttons || null,
            tenantId: null,
            status: (process.env['NODE_ENV'] === 'test' || this.configService.get('WPP_REAL_SEND') !== 'true') ? 'APPROVED' : 'PENDING'
          },
          update: {
            category: content.category || 'UTILITY',
            language: content.language || 'es_AR',
            body: content.body,
            buttons: content.buttons || null,
          }
        });
      } catch (error) {
        this.logger.error(`Error procesando archivo de plantilla ${file}: ${error.message}`);
      }
    }

    // Limpieza automática de plantillas globales obsoletas
    try {
      const deleteResult = await this.prisma.whatsappTemplate.deleteMany({
        where: {
          tenantId: null,
          wabaId: defaultWabaId || null,
          name: {
            notIn: loadedNames
          }
        }
      });
      if (deleteResult.count > 0) {
        this.logger.log(`Se eliminaron ${deleteResult.count} plantillas globales obsoletas de la base de datos.`);
      }
    } catch (cleanupError) {
      this.logger.error(`Error al limpiar plantillas obsoletas: ${cleanupError.message}`);
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
      this.logger.warn('No se puede sincronizar con Meta: WABA ID o Access Token no configurados.');
      return null;
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
              await this.prisma.whatsappTemplate.update({
                where: { id: dbTemplate.id },
                data: { status: 'PENDING' }
              });
              results.updated++;
            } else {
              this.logger.warn(
                `La plantilla '${dbTemplate.name}' tiene cambios locales pero su estado en Meta es '${metaTemplate.status}'. Se omite la actualización/recreación automática para evitar el bloqueo por cooldown de eliminación en Meta. Si deseas forzar la actualización, bórrala manualmente en Meta Business Suite o renómbrala.`
              );
            }
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

    // 1. Check body changes
    let varCount = 0;
    const dbMetaBody = dbTemplate.body.replace(/{{(\w+)}}/g, () => {
      varCount++;
      return `{{${varCount}}}`;
    });

    const metaBody = metaTemplate.components.find(c => c.type === 'BODY')?.text;
    if (dbMetaBody !== metaBody) return true;

    // 2. Check buttons changes
    const dbButtons = dbTemplate.buttons ? JSON.parse(JSON.stringify(dbTemplate.buttons)) : null;
    const metaButtonsComp = metaTemplate.components.find(c => c.type === 'BUTTONS');
    const metaButtons = metaButtonsComp?.buttons;

    if (!dbButtons && !metaButtons) return false;
    if ((dbButtons && !metaButtons) || (!dbButtons && metaButtons)) return true;
    if (dbButtons.length !== metaButtons.length) return true;

    // Compare each button
    for (let i = 0; i < dbButtons.length; i++) {
      const dbBtn = dbButtons[i];
      const metaBtn = metaButtons[i];

      if (dbBtn.type !== metaBtn.type || dbBtn.text !== metaBtn.text) return true;

      if (dbBtn.type === 'URL') {
        let btnVarCount = 0;
        const dbBtnUrl = dbBtn.url.replace(/{{(\w+)}}/g, () => {
          btnVarCount++;
          return `{{${btnVarCount}}}`;
        });
        if (dbBtnUrl !== metaBtn.url) return true;
      }
    }

    return false;
  }

  private async getMetaTemplates(wabaId: string, accessToken: string) {
    const response = await axios.get(`${this.baseUrl}/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data.data;
  }

  private prepareComponents(templateBody: string, buttonsJson?: any) {
    let varCount = 0;
    const examples: string[] = [];
    const metaBody = templateBody.replace(/{{(\w+)}}/g, (match, varName) => {
      varCount++;
      examples.push(`[${varName}]`); 
      return `{{${varCount}}}`;
    });

    const components: any[] = [];

    const bodyComponent: any = {
      type: 'BODY',
      text: metaBody,
    };

    if (varCount > 0) {
      bodyComponent.example = {
        body_text: [examples]
      };
    }

    components.push(bodyComponent);

    if (buttonsJson && Array.isArray(buttonsJson) && buttonsJson.length > 0) {
      const metaButtons = buttonsJson.map((btn: any) => {
        if (btn.type === 'URL') {
          let btnVarCount = 0;
          const btnUrl = btn.url.replace(/{{(\w+)}}/g, () => {
            btnVarCount++;
            return `{{${btnVarCount}}}`;
          });

          const buttonMeta: any = {
            type: 'URL',
            text: btn.text,
            url: btnUrl
          };

          if (btnVarCount > 0) {
            buttonMeta.example = ['placeholder_id'];
          }

          return buttonMeta;
        }
        return btn;
      });

      components.push({
        type: 'BUTTONS',
        buttons: metaButtons
      });
    }

    return components;
  }

  private async createMetaTemplate(wabaId: string, accessToken: string, template: any) {
    const components = this.prepareComponents(template.body, template.buttons);

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
    const components = this.prepareComponents(template.body, template.buttons);

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
