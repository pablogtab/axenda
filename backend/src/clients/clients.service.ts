import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateClientDto, UpdateClientDto } from './dto/client.dto'
import { CreateClientTagDto } from './dto/client-tag.dto'

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD Básico de Clientes ───────────────────────────────────────────────
  
  async findAll(tenantId: string, page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit
    const where: any = { tenantId, active: true }

    if (search) {
      const parts = search.trim().split(/[\s*]+/).filter(p => p.length > 0)
      if (parts.length > 0) {
        where.AND = parts.map(part => ({
          OR: [
            { firstName: { contains: part, mode: 'insensitive' } },
            { lastName: { contains: part, mode: 'insensitive' } },
            { email: { contains: part, mode: 'insensitive' } },
            { phone: { contains: part, mode: 'insensitive' } },
          ],
        }))
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          tags: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ])

    return {
      items,
      total,
      page,
      limit,
    }
  }

  async search(tenantId: string, query: string) {
    const parts = query.trim().split(/[\s*]+/).filter(p => p.length > 0);

    return this.prisma.client.findMany({
      where: {
        tenantId,
        active: true,
        AND: parts.map(part => ({
          OR: [
            { firstName: { contains: part, mode: 'insensitive' } },
            { lastName: { contains: part, mode: 'insensitive' } },
            { email: { contains: part, mode: 'insensitive' } },
            { phone: { contains: part, mode: 'insensitive' } },
          ],
        })),
      },
      take: 10,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        tags: true,
      },
    })

    if (!client || client.tenantId !== tenantId) {
      throw new NotFoundException(`Cliente ${id} no encontrado`)
    }
    return client
  }

  async create(tenantId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        document: dto.document,
        notes: dto.notes,
        photoUrl: dto.photoUrl,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOrFail(tenantId, id)
    return this.prisma.client.update({
      where: { id },
      data: dto,
    })
  }

  async deactivate(tenantId: string, id: string) {
    await this.findOrFail(tenantId, id)
    return this.prisma.client.update({
      where: { id },
      data: { active: false },
    })
  }

  // ─── Gestión de Tags ────────────────────────────────────────────────────────

  async addTag(tenantId: string, clientId: string, dto: CreateClientTagDto) {
    await this.findOrFail(tenantId, clientId)

    return this.prisma.clientTag.create({
      data: {
        tenantId,
        clientId,
        name: dto.name,
        color: dto.color,
      },
    })
  }

  async removeTag(tenantId: string, clientId: string, tagId: string) {
    await this.findOrFail(tenantId, clientId)

    const count = await this.prisma.clientTag.deleteMany({
      where: {
        id: tagId,
        clientId,
        tenantId,
      },
    })

    if (count.count === 0) {
      throw new NotFoundException(`Tag ${tagId} no encontrado`)
    }

    return { success: true }
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async findOrFail(tenantId: string, id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } })
    if (!client || client.tenantId !== tenantId) {
      throw new NotFoundException(`Cliente ${id} no encontrado`)
    }
    return client
  }
}
