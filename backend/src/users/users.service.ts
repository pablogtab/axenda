import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateRoleDto } from './dto/update-role.dto'
import { UserRole, AuthProvider } from '@prisma/client'

// Fields returned in all user responses (no passwordHash)
const USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const

const BCRYPT_ROUNDS = process.env['NODE_ENV'] === 'test' ? 1 : 12

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── /me ─────────────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    })
    if (!user) throw new NotFoundException(`Usuario ${userId} no encontrado`)
    return user
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const data: any = {}
    if (dto.firstName) data['firstName'] = dto.firstName
    if (dto.lastName) data['lastName'] = dto.lastName

    if (dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      data['identities'] = {
        updateMany: {
          where: { provider: AuthProvider.EMAIL },
          data: { passwordHash },
        },
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    })
  }

  // ─── Tenant-scoped CRUD ───────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, active: true },
      select: USER_SELECT,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
  }

  async findOne(tenantId: string, userId: string) {
    return this.findOrFail(userId, tenantId)
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    })
    if (existing) {
      throw new ConflictException(`El email "${dto.email}" ya está en uso en este tenant`)
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role ?? UserRole.RECEPTIONIST,
        identities: {
          create: {
            provider: AuthProvider.EMAIL,
            providerId: dto.email,
            passwordHash,
          },
        },
      },
      select: USER_SELECT,
    })
  }

  async update(tenantId: string, userId: string, dto: UpdateUserDto) {
    await this.findOrFail(userId, tenantId)

    const data: any = {}
    if (dto.firstName) data['firstName'] = dto.firstName
    if (dto.lastName) data['lastName'] = dto.lastName

    if (dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      data['identities'] = {
        updateMany: {
          where: { provider: AuthProvider.EMAIL },
          data: { passwordHash },
        },
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    })
  }

  async updateRole(tenantId: string, userId: string, dto: UpdateRoleDto, requesterId: string) {
    if (userId === requesterId) {
      throw new ForbiddenException('No puedes cambiar tu propio rol')
    }
    await this.findOrFail(userId, tenantId)

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: USER_SELECT,
    })
  }

  async deactivate(tenantId: string, userId: string, requesterId: string) {
    if (userId === requesterId) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta')
    }
    await this.findOrFail(userId, tenantId)

    return this.prisma.user.update({
      where: { id: userId },
      data: { active: false },
      select: USER_SELECT,
    })
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────────

  private async findOrFail(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: USER_SELECT,
    })
    if (!user) throw new NotFoundException(`Usuario ${userId} no encontrado`)
    return user
  }
}
