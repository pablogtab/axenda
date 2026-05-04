import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene el estado detallado de la suscripción de un tenant
   */
  async getSubscriptionStatus(tenantId: string) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException('No se encontró información de suscripción para este negocio.');
    }

    const profCount = await this.prisma.professional.count({ where: { tenantId, active: true } });
    const branchCount = await this.prisma.branch.count({ where: { tenantId, active: true } });
    const userCount = await this.prisma.user.count({ where: { tenantId, active: true } });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const apptCount = await this.prisma.appointment.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
      },
    });

    const now = new Date();
    const trialDaysRemaining = sub.trialEndsAt && sub.trialEndsAt > now
      ? Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      plan: {
        code: sub.plan.code,
        name: sub.plan.name,
        description: sub.plan.description,
      },
      status: sub.status,
      billingCycle: sub.billingCycle,
      trialEndsAt: sub.trialEndsAt,
      trialDaysRemaining,
      isTrial: sub.status === 'TRIALING',
      isActive: sub.status === 'ACTIVE' || (sub.status === 'TRIALING' && trialDaysRemaining > 0),
      limits: {
        maxProfessionals: sub.plan.maxProfessionals,
        maxBranches: sub.plan.maxBranches,
        maxAppointments: sub.plan.maxAppointments,
        maxUsers: sub.plan.maxUsers,
        hasReports: sub.plan.hasReports,
        hasOnlinePayments: sub.plan.hasOnlinePayments,
        hasAutoReviews: sub.plan.hasAutoReviews,
      },
      usage: {
        professionals: profCount,
        branches: branchCount,
        users: userCount,
        appointmentsMonth: apptCount,
      },
    };
  }

  /**
   * Valida si un tenant puede realizar una acción basada en sus límites
   * @throws ForbiddenException si se excede el límite
   */
  async validateLimit(tenantId: string, feature: 'PROFESSIONALS' | 'BRANCHES' | 'APPOINTMENTS' | 'USERS') {
    const status = await this.getSubscriptionStatus(tenantId);

    if (!status.isActive) {
      throw new ForbiddenException('Tu suscripción no está activa. Por favor, regulariza tu cuenta.');
    }

    switch (feature) {
      case 'PROFESSIONALS':
        const profCount = await this.prisma.professional.count({ where: { tenantId, active: true } });
        if (profCount >= status.limits.maxProfessionals) {
          throw new ForbiddenException(`Has alcanzado el límite de profesionales (${status.limits.maxProfessionals}) para tu plan ${status.plan.name}.`);
        }
        break;

      case 'BRANCHES':
        const branchCount = await this.prisma.branch.count({ where: { tenantId, active: true } });
        if (branchCount >= status.limits.maxBranches) {
          throw new ForbiddenException(`Has alcanzado el límite de sucursales (${status.limits.maxBranches}) para tu plan ${status.plan.name}.`);
        }
        break;

      case 'USERS':
        const userCount = await this.prisma.user.count({ where: { tenantId, active: true } });
        if (userCount >= status.limits.maxUsers) {
          throw new ForbiddenException(`Has alcanzado el límite de usuarios (${status.limits.maxUsers}) para tu plan ${status.plan.name}.`);
        }
        break;

      case 'APPOINTMENTS':
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const apptCount = await this.prisma.appointment.count({
          where: {
            tenantId,
            createdAt: { gte: startOfMonth },
          },
        });

        if (apptCount >= status.limits.maxAppointments) {
          throw new ForbiddenException(`Has alcanzado el límite de turnos mensuales (${status.limits.maxAppointments}) para tu plan ${status.plan.name}.`);
        }
        break;
    }

    return true;
  }
}
