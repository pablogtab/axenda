import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProfessionalDto } from './dto/create-professional.dto'
import { UpdateProfessionalDto } from './dto/update-professional.dto'
import { CreateAvailabilityDto, CreateExceptionDto } from './dto/availability.dto'

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD Básico ────────────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.prisma.professional.findMany({
      where: { tenantId },
      include: {
        branches: { include: { branch: true } },
        services: { include: { service: true } },
        availability: true,
        user: { select: { email: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
  }

  async findOne(tenantId: string, id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: {
        branches: { include: { branch: true } },
        services: { include: { service: true } },
        availability: true,
        exceptions: {
          where: {
            OR: [
              { date: { gte: new Date() } },
              { endDate: { gte: new Date() } }
            ]
          },
          orderBy: { date: 'asc' },
        },
      },
    })

    if (!professional || professional.tenantId !== tenantId) {
      throw new NotFoundException(`Profesional ${id} no encontrado`)
    }
    return professional
  }

  async create(tenantId: string, dto: CreateProfessionalDto) {
    return this.prisma.professional.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        bio: dto.bio,
        photoUrl: dto.photoUrl,
        color: dto.color,
        userId: dto.userId,
        active: dto.active,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateProfessionalDto) {
    await this.findOrFail(tenantId, id)
    return this.prisma.professional.update({
      where: { id },
      data: dto,
    })
  }

  async delete(tenantId: string, id: string) {
    await this.findOrFail(tenantId, id)
    return this.prisma.professional.delete({
      where: { id },
    })
  }

  // ─── Relaciones (Sucursales y Servicios) ───────────────────────────────────

  async setBranches(tenantId: string, id: string, branchIds: string[]) {
    await this.findOrFail(tenantId, id)

    // Validar que todas las sucursales existan y pertenezcan al tenant
    const validBranches = await this.prisma.branch.count({
      where: {
        id: { in: branchIds },
        tenantId,
      },
    })

    if (validBranches !== branchIds.length && branchIds.length > 0) {
      throw new BadRequestException('Una o más sucursales son inválidas o no pertenecen al Tenant')
    }

    // Reemplazar relaciones (borrar existentes, crear nuevas en una transacción)
    return this.prisma.$transaction(async (tx) => {
      await tx.professionalBranch.deleteMany({ where: { professionalId: id } })
      
      if (branchIds.length > 0) {
        await tx.professionalBranch.createMany({
          data: branchIds.map((branchId) => ({
            professionalId: id,
            branchId,
          })),
        })
      }

      return tx.professional.findUnique({
        where: { id },
        include: { branches: { include: { branch: true } } },
      })
    })
  }

  async setServices(tenantId: string, id: string, serviceIds: string[]) {
    await this.findOrFail(tenantId, id)

    // Similar validación (comentado para evitar error si no hay DB mock de service,
    // pero si service schema existe, funcionaría). Asumimos que service existe.
    const validServices = await this.prisma.service.count({
      where: {
        id: { in: serviceIds },
        tenantId,
      },
    })

    if (validServices !== serviceIds.length && serviceIds.length > 0) {
      throw new BadRequestException('Uno o más servicios son inválidos')
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.professionalService.deleteMany({ where: { professionalId: id } })
      
      if (serviceIds.length > 0) {
        await tx.professionalService.createMany({
          data: serviceIds.map((serviceId) => ({
            professionalId: id,
            serviceId,
          })),
        })
      }

      return tx.professional.findUnique({
        where: { id },
        include: { services: { include: { service: true } } },
      })
    })
  }

  // ─── Disponibilidad y Excepciones ──────────────────────────────────────────

  async addAvailability(tenantId: string, id: string, dto: CreateAvailabilityDto) {
    await this.findOrFail(tenantId, id)

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('La hora de fin debe ser posterior a la de inicio')
    }

    // Si pasaron branchId, validar que pertenezca al professional o tenant
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      })
      if (!branch) throw new BadRequestException('Sucursal no encontrada')
    }

    return this.prisma.availability.create({
      data: {
        professionalId: id,
        ...dto,
      },
    })
  }

  async removeAvailability(tenantId: string, id: string, availabilityId: string) {
    await this.findOrFail(tenantId, id)
    
    const count = await this.prisma.availability.deleteMany({
      where: { id: availabilityId, professionalId: id },
    })

    if (count.count === 0) {
      throw new NotFoundException('Horario de disponibilidad no encontrado')
    }
    
    return { success: true }
  }

  async addException(tenantId: string, id: string, dto: CreateExceptionDto) {
    await this.findOrFail(tenantId, id)

    if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('La hora de fin debe ser posterior a la de inicio')
    }

    return this.prisma.availabilityException.create({
      data: {
        professionalId: id,
        type: dto.type,
        date: new Date(dto.date),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
    })
  }

  async removeException(tenantId: string, id: string, exceptionId: string) {
    await this.findOrFail(tenantId, id)

    const count = await this.prisma.availabilityException.deleteMany({
      where: { id: exceptionId, professionalId: id },
    })

    if (count.count === 0) {
      throw new NotFoundException('Excepción no encontrada')
    }

    return { success: true }
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async findOrFail(tenantId: string, id: string) {
    const prof = await this.prisma.professional.findUnique({ where: { id } })
    if (!prof || prof.tenantId !== tenantId) {
      throw new NotFoundException(`Profesional ${id} no encontrado`)
    }
    return prof
  }
}
