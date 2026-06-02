import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AppointmentsService } from './appointments.service'
import { CreatePublicAppointmentDto } from './dto/public-appointment.dto'
import { GetAvailabilityDto } from './dto/availability-query.dto'
import { TenantsService } from '../tenants/tenants.service'

@ApiTags('Public Appointments')
@Controller('p/:slug/appointments')
export class PublicAppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get('availability')
  @ApiOperation({ summary: 'Consultar disponibilidad pública para un negocio' })
  async getAvailability(
    @Param('slug') slug: string,
    @Query() query: GetAvailabilityDto
  ) {
    const tenant = await this.tenantsService.findByPublicSlug(slug, query.invitationToken)
    if (!tenant) throw new NotFoundException('Negocio no encontrado')
    
    return this.appointmentsService.getAvailability(tenant.id, query)
  }

  @Post('book')
  @ApiOperation({ summary: 'Agendar un turno de forma pública' })
  async createFromPublic(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicAppointmentDto
  ) {
    const tenant = await this.tenantsService.findByPublicSlug(slug, dto.invitationToken)
    if (!tenant) throw new NotFoundException('Negocio no encontrado')

    return this.appointmentsService.createFromPublic(tenant.id, dto)
  }
}
