import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto'

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Categorías ─────────────────────────────────────────────────────────────

  async findAllCategories(tenantId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: {
        tenantId,
        name: dto.name,
      },
    })
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, tenantId },
    })
    if (!category) throw new NotFoundException(`Categoría ${id} no encontrada`)

    return this.prisma.serviceCategory.update({
      where: { id },
      data: dto,
    })
  }

  async deactivateCategory(tenantId: string, id: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, tenantId },
    })
    if (!category) throw new NotFoundException(`Categoría ${id} no encontrada`)

    return this.prisma.serviceCategory.update({
      where: { id },
      data: { active: false },
    })
  }

  // ─── Servicios ──────────────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.prisma.service.findMany({
      where: { tenantId, active: true },
      include: {
        category: { select: { name: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    })
  }

  async findOne(tenantId: string, id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        professionals: { include: { professional: true } },
      },
    })

    if (!service || service.tenantId !== tenantId) {
      throw new NotFoundException(`Servicio ${id} no encontrado`)
    }
    return service
  }

  async create(tenantId: string, dto: CreateServiceDto) {
    if (dto.categoryId) {
      await this.validateCategory(tenantId, dto.categoryId)
    }

    return this.prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          duration: dto.duration,
          price: dto.price,
          color: dto.color,
          categoryId: dto.categoryId,
          active: dto.active ?? true,
          isBookablePublic: dto.isBookablePublic ?? true,
          showPrice: dto.showPrice ?? true,
          customPriceLabel: dto.customPriceLabel,
          showDuration: dto.showDuration ?? true,
          indications: dto.indications,
          includes: dto.includes ? (dto.includes as any) : undefined,
          mainImageKey: dto.mainImageKey,
          galleryKeys: dto.galleryKeys ? (dto.galleryKeys as any) : undefined,
        },
      })

      const professionals = await tx.professional.findMany({
        where: { tenantId, allServices: true, active: true }
      })

      if (professionals.length > 0) {
        await tx.professionalService.createMany({
          data: professionals.map(p => ({
            professionalId: p.id,
            serviceId: service.id
          }))
        })
      }

      return service
    })
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
    })
    if (!service) throw new NotFoundException(`Servicio ${id} no encontrado`)

    if (dto.categoryId) {
      await this.validateCategory(tenantId, dto.categoryId)
    }
    // dto.categoryId === null → quitar categoría; undefined → no tocar

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.service.update({
        where: { id },
        data: dto,
      })

      if (dto.active === true && !service.active) {
        const professionals = await tx.professional.findMany({
          where: { tenantId, allServices: true, active: true }
        })
        for (const p of professionals) {
          await tx.professionalService.upsert({
            where: {
              professionalId_serviceId: {
                professionalId: p.id,
                serviceId: id
              }
            },
            create: {
              professionalId: p.id,
              serviceId: id
            },
            update: {}
          })
        }
      }

      return updated
    })
  }

  async deactivate(tenantId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
    })
    if (!service) throw new NotFoundException(`Servicio ${id} no encontrado`)

    // Check if there are appointments associated with this service
    const hasAppointments = await this.prisma.appointment.findFirst({
      where: { serviceId: id },
    })

    if (hasAppointments) {
      // If there are appointments, we soft delete it to preserve history
      return this.prisma.service.update({
        where: { id },
        data: { active: false },
      })
    }

    // Otherwise, delete it physically and return the record with active = false for compatibility
    const deleted = await this.prisma.service.delete({
      where: { id },
    })

    return {
      ...deleted,
      active: false,
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async validateCategory(tenantId: string, categoryId: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id: categoryId, tenantId, active: true },
    })
    if (!category) {
      throw new BadRequestException('La categoría asignada no existe o no pertenece al Tenant')
    }
  }
}
