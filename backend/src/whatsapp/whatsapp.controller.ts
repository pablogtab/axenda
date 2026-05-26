import { Controller, Get, Post, Patch, Body, UseGuards, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  @Get('config')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener configuración de WhatsApp del tenant' })
  getConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.whatsappService.getTenantWhatsappConfig(user.tenantId);
  }

  @Get('templates')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener plantillas de WhatsApp' })
  getTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.whatsappService.getTemplates(user.tenantId);
  }

  @Patch('config')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar configuración de WhatsApp' })
  updateConfig(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.whatsappService.updateConfig(user.tenantId, body);
  }

  @Post('embedded-signup')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Finalizar flujo de embedded signup de Meta' })
  embeddedSignup(@CurrentUser() user: AuthenticatedUser, @Body('code') code: string) {
    return this.whatsappService.exchangeCodeForToken(user.tenantId, code);
  }

  // Webhook de Meta (Público)
  @Get('webhook')
  @ApiOperation({ summary: 'Verificación del Webhook de Meta' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = this.configService.get('WPP_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }
    this.logger.warn('Webhook verification failed');
    return 'Forbidden';
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recibir eventos del Webhook de Meta' })
  handleWebhook(@Body() body: any) {
    this.logger.log('WPP Webhook Event received');
    // TODO: Implementar procesamiento real de eventos
    return { success: true };
  }
}
