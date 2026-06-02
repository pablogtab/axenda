import { Controller, Get, Post, Delete, UseGuards, Body, Param } from '@nestjs/common';
import { BookingInvitationsService } from './booking-invitations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBookingInvitationDto } from './dto/create-booking-invitation.dto';

@Controller('booking-invitations')
export class BookingInvitationsController {
  constructor(private readonly bookingInvitationsService: BookingInvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateBookingInvitationDto
  ) {
    return this.bookingInvitationsService.create(tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.bookingInvitationsService.findAll(tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.bookingInvitationsService.delete(tenantId, id);
  }

  @Get('public/validate/:token')
  async validateToken(@Param('token') token: string) {
    const invitation = await this.bookingInvitationsService.validateToken(token);
    // Retornamos una respuesta limpia sin datos innecesarios al público
    return {
      id: invitation.id,
      tenantId: invitation.tenantId,
      description: invitation.description,
      startDate: invitation.startDate,
      endDate: invitation.endDate,
      schedule: invitation.schedule,
      tenant: invitation.tenant,
      branchId: invitation.branchId,
      professionalId: invitation.professionalId,
      clientId: invitation.clientId,
      branch: invitation.branch,
      professional: invitation.professional,
      client: invitation.client,
    };
  }
}
