import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { ProfessionalsService } from './professionals.service'
import { CreateProfessionalDto } from './dto/create-professional.dto'
import { UpdateProfessionalDto } from './dto/update-professional.dto'
import { UpdateProfessionalRelationsDto } from './dto/update-professional-relations.dto'
import { CreateAvailabilityDto, CreateExceptionDto } from './dto/availability.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Professionals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  // ─── CRUD Básico ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar profesionales del tenant' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.professionalsService.findAll(user.tenantId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un profesional (horarios, sucursales)' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.professionalsService.findOne(user.tenantId, id)
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo profesional' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(user.tenantId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar perfil del profesional' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateProfessionalDto) {
    return this.professionalsService.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar profesional permanentemente' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.professionalsService.delete(user.tenantId, id)
  }

  // ─── Relaciones (Sucursales y Servicios) ───────────────────────────────────

  @Patch(':id/branches')
  @ApiOperation({ summary: 'Asignar sucursales al profesional' })
  setBranches(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalRelationsDto,
  ) {
    return this.professionalsService.setBranches(user.tenantId, id, dto.ids)
  }

  @Patch(':id/services')
  @ApiOperation({ summary: 'Asignar servicios al profesional' })
  setServices(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalRelationsDto,
  ) {
    return this.professionalsService.setServices(user.tenantId, id, dto.ids)
  }

  // ─── Disponibilidad y Excepciones ──────────────────────────────────────────

  @Post(':id/availability')
  @ApiOperation({ summary: 'Agregar bloque de disponibilidad semanal (schedule)' })
  addAvailability(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.professionalsService.addAvailability(user.tenantId, id, dto)
  }

  @Delete(':id/availability/:availabilityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar bloque de disponibilidad' })
  removeAvailability(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('availabilityId') availabilityId: string,
  ) {
    return this.professionalsService.removeAvailability(user.tenantId, id, availabilityId)
  }

  @Post(':id/exceptions')
  @ApiOperation({ summary: 'Agregar excepción (vacaciones, bloqueo manual)' })
  addException(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateExceptionDto,
  ) {
    return this.professionalsService.addException(user.tenantId, id, dto)
  }

  @Delete(':id/exceptions/:exceptionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar excepción' })
  removeException(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
  ) {
    return this.professionalsService.removeException(user.tenantId, id, exceptionId)
  }
}
