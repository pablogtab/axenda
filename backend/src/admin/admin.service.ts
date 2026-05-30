import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus, SubscriptionBillingCycle } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Authentication ─────────────────────────────────────────────────────────

  async login(dto: any) {
    const { email, password } = dto;
    if (!email || !password) {
      throw new BadRequestException('Email y contraseña son requeridos.');
    }

    // Buscar en la tabla system_users (separada de los usuarios de tenants)
    const systemUser = await this.prisma.systemUser.findUnique({
      where: { email: email.trim() },
    });

    if (!systemUser || !systemUser.active) {
      throw new UnauthorizedException('Credenciales inválidas o acceso no autorizado.');
    }

    const isValid = await bcrypt.compare(password, systemUser.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return this._generateSystemTokens(systemUser.id);
  }

  async refreshToken(systemUserId: string, oldToken: string) {
    // Rotar: eliminar token viejo, emitir nuevo par
    await this.prisma.systemRefreshToken.deleteMany({
      where: { systemUserId, token: oldToken },
    });
    return this._generateSystemTokens(systemUserId);
  }

  async logout(systemUserId: string, refreshToken: string) {
    await this.prisma.systemRefreshToken.deleteMany({
      where: { systemUserId, token: refreshToken },
    });
  }

  private async _generateSystemTokens(systemUserId: string) {
    const payload = { sub: systemUserId, role: 'SUPER_ADMIN' };

    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const accessTokenExpiresIn = this.config.get<string>('JWT_EXPIRES_IN', '15m');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, jti: crypto.randomUUID() }),
      this.jwtService.signAsync({ ...payload, jti: crypto.randomUUID() } as any, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      } as any),
    ]);

    const expiresAt = this._parseExpiry(accessTokenExpiresIn);
    const refreshExpiresAt = this._parseExpiry(refreshExpiresIn);

    // Persistir refresh token para revocación
    await this.prisma.systemRefreshToken.create({
      data: { systemUserId, token: refreshToken, expiresAt: refreshExpiresAt },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  private _parseExpiry(expiry: string): Date {
    const units: Record<string, number> = {
      d: 86_400_000,
      h: 3_600_000,
      m: 60_000,
      s: 1_000,
    };
    const match = expiry.match(/^(\d+)([dhms])$/);
    const ms = match ? parseInt(match[1], 10) * (units[match[2]] ?? 0) : 7 * 86_400_000;
    return new Date(Date.now() + ms);
  }

  // ─── Metrics ────────────────────────────────────────────────────────────────

  async getMetrics() {
    const [
      totalTenants,
      activeSubs,
      trialSubs,
      totalAppointments,
      whatsappConfigs,
      totalUsers,
      totalProfessionals,
      totalServices,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenantSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenantSubscription.count({ where: { status: 'TRIALING' } }),
      this.prisma.appointment.count(),
      this.prisma.tenantWhatsappConfig.findMany({ select: { messagesSentMonth: true } }),
      // Solo contar usuarios de tenants reales (excluye system_users por ser tabla separada)
      this.prisma.user.count(),
      this.prisma.professional.count(),
      this.prisma.service.count(),
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    const activeSubscriptions = await this.prisma.tenantSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    let mrr = 0;
    for (const sub of activeSubscriptions) {
      if (sub.plan) {
        if (sub.billingCycle === 'MONTHLY') {
          mrr += Number(sub.plan.priceMonthly || 0);
        } else if (sub.billingCycle === 'YEARLY') {
          mrr += Number(sub.plan.priceYearly || 0) / 12;
        }
      }
    }

    const totalWhatsappSent = whatsappConfigs.reduce((sum, config) => sum + (config.messagesSentMonth || 0), 0);

    return {
      totalTenants,
      activeSubscriptions: activeSubs,
      trialingSubscriptions: trialSubs,
      totalAppointments,
      totalWhatsappSent,
      estimatedMrr: Math.round(mrr),
      totalUsers,
      totalProfessionals,
      totalServices,
    };
  }

  // ─── Tenants ────────────────────────────────────────────────────────────────

  async getTenants(search?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      const trimmedSearch = search.trim();
      where.OR = [
        { name: { contains: trimmedSearch, mode: 'insensitive' } },
        { slug: { contains: trimmedSearch, mode: 'insensitive' } },
        { email: { contains: trimmedSearch, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: {
              users: true,
              professionals: true,
              appointments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async overrideSubscription(tenantId: string, dto: any) {
    const { planCode, billingCycle, status, endDate } = dto;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado.');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });
    if (!plan) {
      throw new NotFoundException(`Plan ${planCode} no existe.`);
    }

    const updatedSub = await this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        billingCycle: billingCycle as SubscriptionBillingCycle,
        status: status as SubscriptionStatus,
        endDate: endDate ? new Date(endDate) : null,
      },
      create: {
        tenantId,
        planId: plan.id,
        billingCycle: billingCycle as SubscriptionBillingCycle,
        status: status as SubscriptionStatus,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        plan: true,
      },
    });

    return updatedSub;
  }

  // ─── Coupons (ReferralCode) ──────────────────────────────────────────────────

  async getCoupons() {
    return this.prisma.referralCode.findMany({
      where: { isSystem: true },
      include: {
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async searchUsers(search?: string) {
    if (!search || search.trim().length < 2) {
      return [];
    }
    const trimmed = search.trim();
    return this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: trimmed, mode: 'insensitive' } },
          { firstName: { contains: trimmed, mode: 'insensitive' } },
          { lastName: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        tenant: {
          select: {
            name: true,
          },
        },
      },
      take: 20,
    });
  }

  async createCoupon(dto: any) {
    const { code, discountPercent, active, isSystem, maxUses, expiresAt, applicablePlanCode, onlyFirstPayment, referrerId } = dto;

    if (!code || discountPercent === undefined) {
      throw new BadRequestException('Código y porcentaje de descuento son requeridos.');
    }

    const normalizedCode = code.trim().toUpperCase();

    const existing = await this.prisma.referralCode.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new BadRequestException(`El código de cupón "${normalizedCode}" ya existe.`);
    }

    if (applicablePlanCode) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { code: applicablePlanCode },
      });
      if (!plan) {
        throw new NotFoundException(`El plan ${applicablePlanCode} no existe.`);
      }
    }

    if (referrerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: referrerId },
      });
      if (!user) {
        throw new NotFoundException('El usuario especificado no existe.');
      }
    }

    return this.prisma.referralCode.create({
      data: {
        code: normalizedCode,
        discountPercent: Number(discountPercent),
        active: active !== false,
        isSystem: isSystem !== false,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        applicablePlanCode: applicablePlanCode || null,
        onlyFirstPayment: onlyFirstPayment !== false,
        referrerId: referrerId || null,
      },
    });
  }

  async updateCoupon(id: string, dto: any) {
    const { active, discountPercent, maxUses, expiresAt, applicablePlanCode, onlyFirstPayment, referrerId } = dto;

    const existing = await this.prisma.referralCode.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Cupón no encontrado.');
    }

    if (applicablePlanCode) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { code: applicablePlanCode },
      });
      if (!plan) {
        throw new NotFoundException(`El plan ${applicablePlanCode} no existe.`);
      }
    }

    if (referrerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: referrerId },
      });
      if (!user) {
        throw new NotFoundException('El usuario especificado no existe.');
      }
    }

    return this.prisma.referralCode.update({
      where: { id },
      data: {
        active: active !== undefined ? !!active : existing.active,
        discountPercent: discountPercent !== undefined ? Number(discountPercent) : existing.discountPercent,
        maxUses: maxUses !== undefined ? (maxUses ? Number(maxUses) : null) : existing.maxUses,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt,
        applicablePlanCode: applicablePlanCode !== undefined ? (applicablePlanCode || null) : existing.applicablePlanCode,
        onlyFirstPayment: onlyFirstPayment !== undefined ? !!onlyFirstPayment : existing.onlyFirstPayment,
        referrerId: referrerId !== undefined ? (referrerId || null) : existing.referrerId,
      },
    });
  }

  async deleteCoupon(id: string) {
    const existing = await this.prisma.referralCode.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Cupón no encontrado.');
    }

    await this.prisma.referralCode.delete({ where: { id } });
    return { success: true };
  }
}
