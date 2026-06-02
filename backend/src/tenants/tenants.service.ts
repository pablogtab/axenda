import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { CreateBranchDto } from './dto/create-branch.dto'
import { UpdateBranchDto } from './dto/update-branch.dto'
import { OnboardingDto } from './dto/onboarding.dto'

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) { }

  // ─── Tenant profile ────────────────────────────────────────────────────────

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { users: true, professionals: true, branches: true } } },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    return tenant
  }

  async findByPublicSlug(publicSlug: string, invitationToken?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { publicSlug },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        logoUrl: true,
        bannerUrl: true,
        primaryColor: true,
        primaryHoverColor: true,
        accentColor: true,
        backgroundColor: true,
        textColor: true,
        category: true,
        phone: true,
        email: true,
        address: true,
        mode: true,
        publicShowBranchSelection: true,
        publicShowProfessionalSelection: true,
        publicActive: true,
        cancellationLimit: true,
        services: {
          where: { active: true, isBookablePublic: true },
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            color: true,
            showPrice: true,
            customPriceLabel: true,
            showDuration: true,
            isBookablePublic: true,
            professionals: {
              select: {
                professionalId: true,
                professional: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    photoUrl: true,
                    availability: true,
                    exceptions: true
                  }
                }
              }
            }
          }
        },
        branches: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    })
    
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }

    if (!tenant.publicActive) {
      if (invitationToken) {
        const invitation = await this.prisma.bookingInvitation.findFirst({
          where: { token: invitationToken, tenantId: tenant.id, active: true },
        });
        if (invitation) {
          const notExpired = !invitation.expiresAt || new Date() <= invitation.expiresAt;
          const notMaxed = invitation.maxUses === null || invitation.usesCount < invitation.maxUses;
          if (notExpired && notMaxed) {
            return tenant;
          }
        }
      }
      throw new NotFoundException('Negocio no encontrado');
    }

    return tenant
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    const reservedSlugs = ['login', 'dashboard', 'admin', 'api', 'p', 'auth', 'settings', 'home', 'agenda', 'clients', 'services', 'branches', 'professionals']
    if (reservedSlugs.includes(slug.toLowerCase())) return false

    const count = await this.prisma.tenant.count({
      where: { publicSlug: slug }
    })
    return count === 0
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    if (dto.publicSlug) {
      const reservedSlugs = ['login', 'dashboard', 'admin', 'api', 'p', 'auth', 'settings', 'home', 'agenda', 'clients', 'services', 'branches', 'professionals']
      if (reservedSlugs.includes(dto.publicSlug.toLowerCase())) {
        throw new ConflictException(`El nombre "${dto.publicSlug}" no está permitido como link`)
      }

      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(dto.publicSlug)) {
        throw new ConflictException('El formato del link no es válido (solo minúsculas, números y guiones)')
      }

      const existing = await this.prisma.tenant.findFirst({
        where: {
          publicSlug: dto.publicSlug,
          id: { not: tenantId },
        },
      })
      if (existing) {
        throw new ConflictException('El link público ya está en uso por otro negocio')
      }
    }

    const updateData = { ...dto }
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    })
  }

  // ─── Branches (Sucursales) ─────────────────────────────────────────────────

  async findBranches(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId, active: true },
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

  async completeOnboarding(tenantId: string, userId: string, dto: OnboardingDto) {
    const { name, logoUrl, mode, metadata, branchName, branchAddress, professionalFirstName, professionalLastName } = dto

    return this.prisma.$transaction(async (tx) => {
      // 0. Obtener email del usuario para el Tenant
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true }
      })

      // 1. Actualizar el Tenant
      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          name,
          logoUrl,
          mode,
          email: user?.email,
          address: branchAddress,
          onboardingCompleted: true,
        },
      })

      // 2. Crear la primera Sucursal
      const branch = await tx.branch.create({
        data: {
          tenantId,
          name: branchName || name,
          address: branchAddress,
        }
      })

      // 3. Crear el primer Profesional y vincularlo al usuario
      const professional = await tx.professional.create({
        data: {
          tenantId,
          userId,
          firstName: professionalFirstName,
          lastName: professionalLastName,
          allServices: true,
          branches: {
            create: {
              branchId: branch.id
            }
          }
        }
      })

      // 4. Configurar disponibilidad del profesional
      const schedule = dto.availability || [
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
      ]

      await tx.availability.createMany({
        data: schedule.map(s => ({
          professionalId: professional.id,
          branchId: branch.id,
          dayOfWeek: s.dayOfWeek === 0 ? 7 : s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      })

      // 5. Cargar servicios por defecto o crear uno genérico si elige manual
      const defaultServices = metadata.loadDefaults 
        ? this.getDefaultServicesByMode(mode)
        : [{ name: 'Servicio General', duration: 60, price: 0, color: '#6366f1' }]

      if (defaultServices.length > 0) {
        // Crear categoría "Principales" por defecto
        const category = await tx.serviceCategory.create({
          data: {
            tenantId,
            name: 'Servicios Principales',
          }
        })

        // Crear los servicios y vincularlos al profesional
        for (const s of defaultServices) {
          const service = await tx.service.create({
            data: {
              tenantId,
              categoryId: category.id,
              name: s.name,
              duration: s.duration,
              price: s.price,
              color: s.color,
            }
          })

          // Vincular al profesional
          await tx.professionalService.create({
            data: {
              professionalId: professional.id,
              serviceId: service.id
            }
          })
        }
      }

      return tenant
    })
  }

  private getDefaultServicesByMode(mode: string) {
    const services: Record<string, any[]> = {
      BARBERSHOP: [
        { name: 'Corte de Cabello', duration: 45, price: 5000, color: '#6366f1' },
        { name: 'Barba & Perfilado', duration: 30, price: 3000, color: '#8b5cf6' },
        { name: 'Coloración', duration: 90, price: 12000, color: '#ec4899' },
      ],
      MEDICAL: [
        { name: 'Consulta Médica', duration: 20, price: 0, color: '#0ea5e9' },
        { name: 'Control / Seguimiento', duration: 15, price: 0, color: '#10b981' },
        { name: 'Estudio Médico', duration: 30, price: 0, color: '#06b6d4' },
      ],
      BEAUTY: [
        { name: 'Limpieza Facial', duration: 60, price: 8000, color: '#f472b6' },
        { name: 'Manicuría / Pedicuría', duration: 45, price: 4000, color: '#fb7185' },
        { name: 'Depilación', duration: 30, price: 3500, color: '#fb923c' },
      ],
      FITNESS: [
        { name: 'Clase Personalizada', duration: 60, price: 6000, color: '#f59e0b' },
        { name: 'Evaluación Física', duration: 30, price: 2000, color: '#ef4444' },
        { name: 'Yoga / Pilates', duration: 60, price: 4000, color: '#10b981' },
      ],
      LEGAL: [
        { name: 'Asesoría Legal', duration: 60, price: 15000, color: '#6366f1' },
        { name: 'Revisión de Contratos', duration: 45, price: 10000, color: '#8b5cf6' },
        { name: 'Mediación', duration: 90, price: 20000, color: '#ec4899' },
      ],
      GENERIC: [
        { name: 'Servicio Estándar', duration: 60, price: 5000, color: '#6366f1' },
        { name: 'Consulta General', duration: 30, price: 3000, color: '#8b5cf6' },
      ],
    }

    return services[mode] || []
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
