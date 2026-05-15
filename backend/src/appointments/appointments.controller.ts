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
  Query,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { AppointmentsService } from './appointments.service'
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto'
import { GetAvailabilityDto } from './dto/availability-query.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface'

@ApiTags('Appointments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ─── Disponibilidad ─────────────────────────────────────────────────────────

  // Permitido para recepcionistas y managers para agendar desde panel
  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Consultar turnos disponibles' })
  getAvailability(@CurrentUser() user: AuthenticatedUser, @Query() query: GetAvailabilityDto) {
    return this.appointmentsService.getAvailability(user.tenantId, query)
  }

  // ─── Gestión de Turnos ──────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Listar turnos del tenant con filtros' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: { startDate?: string; endDate?: string; branchId?: string; statuses?: string[] }
  ) {
    return this.appointmentsService.findAll(user.tenantId, query)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Obtener detalle de un turno' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.findOne(user.tenantId, id)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Crear un nuevo turno desde panel (manual/sobreturno)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user.tenantId, user.sub, dto)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Actualizar datos generales de un turno' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.appointmentsService.update(user.tenantId, id, user.sub, dto)
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Cambiar el estado de un turno (ej. a COMPLETADO)' })
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.changeStatus(user.tenantId, id, user.sub, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancelar turno (Soft Delete)' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.cancel(user.tenantId, id, user.sub)
  }
}
