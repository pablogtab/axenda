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
      where: { tenantId },
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

    return this.prisma.service.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        duration: dto.duration,
        price: dto.price,
        color: dto.color,
        categoryId: dto.categoryId,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
    })
    if (!service) throw new NotFoundException(`Servicio ${id} no encontrado`)

    if (dto.categoryId && dto.categoryId !== service.categoryId) {
      await this.validateCategory(tenantId, dto.categoryId)
    }

    return this.prisma.service.update({
      where: { id },
      data: dto,
    })
  }

  async deactivate(tenantId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
    })
    if (!service) throw new NotFoundException(`Servicio ${id} no encontrado`)

    return this.prisma.service.update({
      where: { id },
      data: { active: false },
    })
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
