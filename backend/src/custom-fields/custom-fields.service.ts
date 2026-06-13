import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CustomFieldType, CustomFieldEntity } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateCustomFieldDefinitionDto,
  CreateCustomFieldListDto,
  CreateCustomFieldListOptionDto,
  UpdateCustomFieldDefinitionDto,
  UpdateCustomFieldListDto,
  UpdateCustomFieldListOptionDto,
} from './dto/custom-field.dto'

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefinitions(tenantId: string, entityType: CustomFieldEntity = 'CLIENT') {
    return this.prisma.customFieldDefinition.findMany({
      where: { tenantId, entityType },
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
    })
  }

  async createDefinition(tenantId: string, dto: CreateCustomFieldDefinitionDto) {
    const entityType = dto.entityType || CustomFieldEntity.CLIENT
    const current = await this.prisma.customFieldDefinition.findMany({
      where: { tenantId, entityType },
      orderBy: { order: 'asc' },
    })

    if (current.length >= 10) {
      throw new BadRequestException('Solo puedes crear hasta 10 campos personalizados por entidad')
    }

    const nextOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((index) => !current.some((definition) => definition.order === index))
    if (nextOrder === undefined) {
      throw new BadRequestException('No hay posiciones disponibles para nuevos campos')
    }

    const listId = await this.normalizeAndValidateList(tenantId, dto.type, dto.listId)
    const defaultValue = await this.normalizeDefaultValue(tenantId, dto.type, listId, dto.defaultValue)

    return this.prisma.customFieldDefinition.create({
      data: {
        tenantId,
        entityType,
        name: dto.name,
        type: dto.type,
        defaultValue,
        listId,
        order: nextOrder,
        required: dto.required ?? false,
        showInPublicView: dto.showInPublicView ?? true,
      },
      include: {
        list: {
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })
  }

  async updateDefinition(tenantId: string, id: string, dto: UpdateCustomFieldDefinitionDto) {
    const definition = await this.prisma.customFieldDefinition.findFirst({
      where: { id, tenantId },
    })
    if (!definition) {
      throw new NotFoundException(`Definición ${id} no encontrada`)
    }

    const nextType = dto.type ?? definition.type
    const nextListId = await this.normalizeAndValidateList(tenantId, nextType, dto.listId ?? definition.listId ?? undefined)
    const rawDefaultValue = dto.defaultValue !== undefined ? dto.defaultValue : definition.defaultValue
    const nextDefaultValue = await this.normalizeDefaultValue(tenantId, nextType, nextListId, rawDefaultValue)

    if (dto.order !== undefined && dto.order !== definition.order) {
      const target = await this.prisma.customFieldDefinition.findFirst({
        where: {
          tenantId,
          entityType: definition.entityType,
          order: dto.order,
        },
      })

      await this.prisma.$transaction(async (tx) => {
        // Usamos un valor temporal para evitar colisión del unique (tenantId, entityType, order)
        await tx.customFieldDefinition.update({
          where: { id },
          data: { order: -1 },
        })

        if (target) {
          await tx.customFieldDefinition.update({
            where: { id: target.id },
            data: { order: definition.order },
          })
        }

        await tx.customFieldDefinition.update({
          where: { id },
          data: {
            name: dto.name,
            type: dto.type,
            listId: nextListId,
            defaultValue: nextDefaultValue,
            required: dto.required,
            showInPublicView: dto.showInPublicView,
            order: dto.order,
          },
        })
      })

      return this.prisma.customFieldDefinition.findUnique({
        where: { id },
        include: {
          list: {
            include: {
              options: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      })
    }

    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        listId: nextListId,
        defaultValue: nextDefaultValue,
        required: dto.required,
        showInPublicView: dto.showInPublicView,
      },
      include: {
        list: {
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })
  }

  async deleteDefinition(tenantId: string, id: string) {
    const deleted = await this.prisma.customFieldDefinition.deleteMany({
      where: { id, tenantId },
    })

    if (deleted.count === 0) {
      throw new NotFoundException(`Definición ${id} no encontrada`)
    }

    return { success: true }
  }

  async getLists(tenantId: string) {
    return this.prisma.customFieldList.findMany({
      where: { tenantId },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  async createList(tenantId: string, dto: CreateCustomFieldListDto) {
    return this.prisma.customFieldList.create({
      data: {
        tenantId,
        name: dto.name,
      },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async updateList(tenantId: string, id: string, dto: UpdateCustomFieldListDto) {
    const list = await this.prisma.customFieldList.findFirst({
      where: { id, tenantId },
    })
    if (!list) {
      throw new NotFoundException(`Lista ${id} no encontrada`)
    }

    return this.prisma.customFieldList.update({
      where: { id },
      data: { name: dto.name },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async deleteList(tenantId: string, id: string) {
    const list = await this.prisma.customFieldList.findFirst({
      where: { id, tenantId },
    })
    if (!list) {
      throw new NotFoundException(`Lista ${id} no encontrada`)
    }

    await this.prisma.customFieldList.delete({ where: { id } })
    return { success: true }
  }

  async addOption(tenantId: string, listId: string, dto: CreateCustomFieldListOptionDto) {
    const list = await this.prisma.customFieldList.findFirst({
      where: { id: listId, tenantId },
      include: {
        options: {
          orderBy: { order: 'desc' },
          take: 1,
        },
      },
    })
    if (!list) {
      throw new NotFoundException(`Lista ${listId} no encontrada`)
    }

    const nextOrder = (list.options[0]?.order ?? -1) + 1

    return this.prisma.customFieldListOption.create({
      data: {
        listId,
        label: dto.label,
        order: nextOrder,
      },
    })
  }

  async updateOption(
    tenantId: string,
    listId: string,
    optionId: string,
    dto: UpdateCustomFieldListOptionDto,
  ) {
    const option = await this.prisma.customFieldListOption.findFirst({
      where: {
        id: optionId,
        listId,
        list: { tenantId },
      },
    })

    if (!option) {
      throw new NotFoundException(`Opción ${optionId} no encontrada`)
    }

    return this.prisma.customFieldListOption.update({
      where: { id: optionId },
      data: { label: dto.label },
    })
  }

  async deleteOption(tenantId: string, listId: string, optionId: string) {
    const deleted = await this.prisma.customFieldListOption.deleteMany({
      where: {
        id: optionId,
        listId,
        list: { tenantId },
      },
    })

    if (deleted.count === 0) {
      throw new NotFoundException(`Opción ${optionId} no encontrada`)
    }

    return { success: true }
  }

  private async normalizeAndValidateList(tenantId: string, type: CustomFieldType, listId?: string) {
    if (type !== CustomFieldType.SELECT) {
      return null
    }

    if (!listId) {
      throw new BadRequestException('Los campos de tipo SELECT requieren listId')
    }

    const list = await this.prisma.customFieldList.findFirst({
      where: { id: listId, tenantId },
    })

    if (!list) {
      throw new BadRequestException('La lista seleccionada no pertenece al tenant')
    }

    return listId
  }

  private async normalizeDefaultValue(
    tenantId: string,
    type: CustomFieldType,
    listId: string | null,
    defaultValue?: string | null,
  ) {
    const normalized = defaultValue?.trim()
    if (!normalized) {
      return null
    }

    if (type === CustomFieldType.BOOLEAN) {
      if (normalized !== 'true' && normalized !== 'false') {
        throw new BadRequestException('El valor por defecto para SI/NO debe ser true o false')
      }
      return normalized
    }

    if (type === CustomFieldType.NUMBER) {
      if (Number.isNaN(Number(normalized))) {
        throw new BadRequestException('El valor por defecto numérico no es válido')
      }
      return normalized
    }

    if (type === CustomFieldType.DATE) {
      if (Number.isNaN(Date.parse(normalized))) {
        throw new BadRequestException('El valor por defecto de fecha no es válido')
      }
      return normalized
    }

    if (type === CustomFieldType.SELECT) {
      if (!listId) {
        throw new BadRequestException('Los campos de tipo SELECT requieren listId')
      }

      const option = await this.prisma.customFieldListOption.findFirst({
        where: {
          id: normalized,
          listId,
          list: { tenantId },
        },
      })

      if (!option) {
        throw new BadRequestException('El valor por defecto no pertenece a la lista seleccionada')
      }
      return normalized
    }

    return normalized
  }
}
