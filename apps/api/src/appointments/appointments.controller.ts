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
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'

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
  getAvailability(@CurrentUser() user: JwtPayload, @Query() query: GetAvailabilityDto) {
    return this.appointmentsService.getAvailability(user.tenantId, query)
  }

  // ─── Gestión de Turnos ──────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Listar turnos del tenant' })
  findAll(@CurrentUser() user: JwtPayload) {
    // Nota: A futuro si es PROFESSIONAL solo deberia ver los suyos. 
    // Lo simplificamos para el MVP.
    return this.appointmentsService.findAll(user.tenantId)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Crear un nuevo turno desde panel (manual/sobreturno)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user.tenantId, user.sub, dto)
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Cambiar el estado de un turno (ej. a COMPLETADO)' })
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.changeStatus(user.tenantId, id, user.sub, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancelar turno (Soft Delete)' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.appointmentsService.cancel(user.tenantId, id, user.sub)
  }
}
