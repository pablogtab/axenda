import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingInvitationDto } from './dto/create-booking-invitation.dto';
import * as crypto from 'crypto';

@Injectable()
export class BookingInvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera un token único y seguro para el link
   */
  private generateUniqueToken(): string {
    return 'inv_' + crypto.randomBytes(12).toString('hex');
  }

  /**
   * Crea una nueva invitación de reserva
   */
  async create(tenantId: string, dto: CreateBookingInvitationDto) {
    const token = this.generateUniqueToken();
    return this.prisma.bookingInvitation.create({
      data: {
        tenantId,
        token,
        description: dto.description,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        schedule: dto.schedule as any,
        branchId: dto.branchId || null,
        professionalId: dto.professionalId || null,
        clientId: dto.clientId || null,
      },
    });
  }

  /**
   * Lista todas las invitaciones de un tenant
   */
  async findAll(tenantId: string) {
    return this.prisma.bookingInvitation.findMany({
      where: { tenantId },
      include: {
        branch: { select: { name: true } },
        professional: { select: { firstName: true, lastName: true } },
        client: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Elimina/desactiva una invitación de reserva
   */
  async delete(tenantId: string, id: string) {
    const invitation = await this.prisma.bookingInvitation.findFirst({
      where: { id, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    return this.prisma.bookingInvitation.delete({
      where: { id },
    });
  }

  /**
   * Valida públicamente un token de invitación y retorna su información
   */
  async validateToken(token: string, excludeAppointmentId?: string) {
    const invitation = await this.prisma.bookingInvitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            publicSlug: true,
            publicActive: true,
          },
        },
        branch: {
          select: { id: true, name: true },
        },
        professional: {
          select: { id: true, firstName: true, lastName: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        appointments: excludeAppointmentId ? {
          where: { id: excludeAppointmentId }
        } : undefined
      },
    });

    if (!invitation) {
      throw new BadRequestException('Este link de invitación no está disponible.');
    }

    if (!invitation.active) {
      throw new BadRequestException('Este link de invitación no está disponible.');
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      throw new BadRequestException('Este link de invitación no está disponible.');
    }

    let usesCount = invitation.usesCount;
    if (excludeAppointmentId && invitation.appointments && invitation.appointments.length > 0) {
      usesCount = Math.max(0, usesCount - 1);
    }

    if (invitation.maxUses !== null && usesCount >= invitation.maxUses) {
      throw new BadRequestException('Este link de invitación no está disponible.');
    }

    return invitation;
  }

  /**
   * Incrementa el contador de usos de una invitación
   */
  async incrementUses(id: string) {
    return this.prisma.bookingInvitation.update({
      where: { id },
      data: {
        usesCount: {
          increment: 1,
        },
      },
    });
  }
}
