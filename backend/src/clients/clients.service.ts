import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CustomFieldType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateClientDto, SaveClientCustomFieldsDto, UpdateClientDto } from './dto/client.dto'
import { CreateClientTagDto } from './dto/client-tag.dto'
import { PhoneUtils } from '../common/utils/phone-utils'

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD Básico de Clientes ───────────────────────────────────────────────
  
  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    fieldId?: string,
    fieldValue?: string,
  ) {
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

    if (fieldId && fieldValue) {
      where.fieldValues = {
        some: {
          fieldId,
          value: fieldValue,
        },
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          tags: true,
          fieldValues: {
            include: {
              field: true,
            },
          },
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
        fieldValues: {
          include: {
            field: {
              include: {
                list: {
                  include: {
                    options: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
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
        ...dto,
        tenantId,
        phone: PhoneUtils.normalize(dto.phone),
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOrFail(tenantId, id)
    return this.prisma.client.update({
      where: { id },
      data: {
        ...dto,
        phone: dto.phone ? PhoneUtils.normalize(dto.phone) : undefined,
      },
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

  async getCustomFields(tenantId: string, clientId: string) {
    await this.findOrFail(tenantId, clientId)

    const [definitions, values] = await Promise.all([
      this.prisma.clientFieldDefinition.findMany({
        where: { tenantId },
        include: {
          list: {
            include: {
              options: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
        orderBy: { order: 'asc' },
      }),
      this.prisma.clientFieldValue.findMany({
        where: { clientId },
      }),
    ])

    return {
      definitions,
      values,
    }
  }

  async saveCustomFields(tenantId: string, clientId: string, dto: SaveClientCustomFieldsDto) {
    await this.findOrFail(tenantId, clientId)

    const definitions = await this.prisma.clientFieldDefinition.findMany({
      where: { tenantId },
      include: {
        list: {
          include: {
            options: true,
          },
        },
      },
    })

    const definitionMap = new Map(definitions.map((definition) => [definition.id, definition]))
    const payloadMap = new Map(dto.values.map((value) => [value.fieldId, value.value]))

    for (const input of dto.values) {
      const definition = definitionMap.get(input.fieldId)
      if (!definition) {
        throw new BadRequestException(`El campo ${input.fieldId} no pertenece al tenant`) 
      }
      this.validateCustomFieldValue(definition.type, input.value, definition.list?.options.map((opt) => opt.id) ?? [])
    }

    for (const definition of definitions) {
      if (!definition.required) {
        continue
      }

      const value = payloadMap.get(definition.id)
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(`El campo "${definition.name}" es obligatorio`)
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const input of dto.values) {
        const value = input.value?.trim()
        if (!value) {
          await tx.clientFieldValue.deleteMany({
            where: {
              clientId,
              fieldId: input.fieldId,
            },
          })
          continue
        }

        await tx.clientFieldValue.upsert({
          where: {
            clientId_fieldId: {
              clientId,
              fieldId: input.fieldId,
            },
          },
          create: {
            clientId,
            fieldId: input.fieldId,
            value,
          },
          update: {
            value,
          },
        })
      }
    })

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

  private validateCustomFieldValue(type: CustomFieldType, value: string | undefined, optionIds: string[]) {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (type === CustomFieldType.BOOLEAN && value !== 'true' && value !== 'false') {
      throw new BadRequestException('El valor booleano debe ser true o false')
    }

    if (type === CustomFieldType.NUMBER && Number.isNaN(Number(value))) {
      throw new BadRequestException('El valor del campo numérico no es válido')
    }

    if (type === CustomFieldType.DATE && Number.isNaN(Date.parse(value))) {
      throw new BadRequestException('El valor del campo fecha no es válido')
    }

    if (type === CustomFieldType.SELECT && optionIds.length > 0 && !optionIds.includes(value)) {
      throw new BadRequestException('La opción seleccionada no pertenece a la lista del campo')
    }
  }
}
