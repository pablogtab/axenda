import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { CreateBranchDto } from './dto/create-branch.dto'
import { UpdateBranchDto } from './dto/update-branch.dto'

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Tenant profile ────────────────────────────────────────────────────────

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { users: true, professionals: true, branches: true } } },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    return tenant
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    })
  }

  // ─── Branches (Sucursales) ─────────────────────────────────────────────────

  async findBranches(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async createBranch(tenantId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: { tenantId, ...dto },
    })
  }

  async updateBranch(tenantId: string, branchId: string, dto: UpdateBranchDto) {
    await this.findBranchOrFail(tenantId, branchId)
    return this.prisma.branch.update({
      where: { id: branchId },
      data: dto,
    })
  }

  async deleteBranch(tenantId: string, branchId: string) {
    await this.findBranchOrFail(tenantId, branchId)
    return this.prisma.branch.update({
      where: { id: branchId },
      data: { active: false },
    })
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async findBranchOrFail(tenantId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    })
    if (!branch) throw new NotFoundException(`Sucursal ${branchId} no encontrada`)
    return branch
  }
}
