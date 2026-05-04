import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { TenantsService } from './tenants.service'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { CreateBranchDto } from './dto/create-branch.dto'
import { UpdateBranchDto } from './dto/update-branch.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'
import { OnboardingDto } from './dto/onboarding.dto'

@ApiTags('Tenants')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ─── Organization profile ───────────────────────────────────────────────────

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Obtener perfil de la organización' })
  findOne(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findOne(user.tenantId)
  }

  @Patch('me')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar datos de la organización (ADMIN)' })
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(user.tenantId, dto)
  }

  @Post('complete-onboarding')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Completar onboarding y configurar entorno (ADMIN)' })
  completeOnboarding(@CurrentUser() user: JwtPayload, @Body() dto: OnboardingDto) {
    return this.tenantsService.completeOnboarding(user.tenantId, user.sub, dto)
  }

  // ─── Branches (Sucursales) ──────────────────────────────────────────────────

  @Get('me/branches')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Listar sucursales de la organización' })
  findBranches(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findBranches(user.tenantId)
  }

  @Post('me/branches')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nueva sucursal (ADMIN)' })
  createBranch(@CurrentUser() user: JwtPayload, @Body() dto: CreateBranchDto) {
    return this.tenantsService.createBranch(user.tenantId, dto)
  }

  @Patch('me/branches/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar sucursal (ADMIN)' })
  updateBranch(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.tenantsService.updateBranch(user.tenantId, id, dto)
  }

  @Delete('me/branches/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar sucursal (soft delete, ADMIN)' })
  deleteBranch(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tenantsService.deleteBranch(user.tenantId, id)
  }
}
