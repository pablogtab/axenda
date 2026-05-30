import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../auth/guards/jwt-refresh.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';

@ApiTags('Admin Backoffice')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Authentication ────────────────────────────────────────────────────────
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión como administrador de Axenda' })
  login(@Body() body: any) {
    return this.adminService.login(body);
  }

  @Post('auth/refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token del administrador del sistema' })
  refresh(@Req() req: any) {
    const user = req.user;
    return this.adminService.refreshToken(user.sub, req.body?.refreshToken ?? '');
  }

  @Post('auth/logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión del administrador del sistema' })
  logout(@Req() req: any, @Body() body: any) {
    return this.adminService.logout(req.user.sub, body?.refreshToken ?? '');
  }

  // ─── Metrics (SUPER_ADMIN only) ─────────────────────────────────────────────
  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener métricas globales de Axenda' })
  getMetrics() {
    return this.adminService.getMetrics();
  }

  // ─── Tenants Management (SUPER_ADMIN only) ──────────────────────────────────
  @Get('tenants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar y buscar negocios (tenants)' })
  getTenants(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getTenants(search, p, l);
  }

  @Patch('tenants/:id/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Modificar manualmente la suscripción de un negocio' })
  overrideSubscription(@Param('id') tenantId: string, @Body() body: any) {
    return this.adminService.overrideSubscription(tenantId, body);
  }

  // ─── Users Lookup (SUPER_ADMIN only) ────────────────────────────────────────
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Buscar usuarios en el sistema' })
  searchUsers(@Query('search') search?: string) {
    return this.adminService.searchUsers(search);
  }

  // ─── Coupons Management (SUPER_ADMIN only) ──────────────────────────────────
  @Get('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar todos los cupones y códigos de descuento' })
  getCoupons() {
    return this.adminService.getCoupons();
  }

  @Post('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Crear un nuevo cupón de descuento' })
  createCoupon(@Body() body: any) {
    return this.adminService.createCoupon(body);
  }

  @Patch('coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar configuración de un cupón' })
  updateCoupon(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateCoupon(id, body);
  }

  @Delete('coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Eliminar un cupón' })
  deleteCoupon(@Param('id') id: string) {
    return this.adminService.deleteCoupon(id);
  }
}
