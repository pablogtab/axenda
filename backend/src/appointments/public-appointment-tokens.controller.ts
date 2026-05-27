import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AppointmentsService } from './appointments.service'

@ApiTags('Public Appointment Tokens')
@Controller('public/appointments')
export class PublicAppointmentTokensController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Obtener detalles de un turno por su token de cancelación' })
  async getByToken(@Param('token') token: string) {
    return this.appointmentsService.findOneByToken(token)
  }

  @Post(':token/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar un turno por su token de cancelación' })
  async cancelByToken(@Param('token') token: string) {
    return this.appointmentsService.cancelByToken(token)
  }

  @Post(':token/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprogramar un turno por su token de cancelación' })
  async rescheduleByToken(
    @Param('token') token: string,
    @Body() body: { startTime: string }
  ) {
    return this.appointmentsService.rescheduleByToken(token, body.startTime)
  }
}
