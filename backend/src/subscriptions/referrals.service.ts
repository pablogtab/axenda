import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfanityFilter } from '../common/utils/profanity-filter';

const RESERVED_WORDS_BLACKLIST = [
  'AXENDA', 'ADMIN', 'SYSTEM', 'DESCUENTO', 'DISCOUNT', 'PROMO', 'OFFER',
  'GRATIS', 'FREE', 'TEST', 'CUPON', 'COUPON', 'SUPERADMIN', 'SUPPORT', 'SOPORTE',
  'REGLAS', 'PLAN'
];

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida un código de referido y retorna sus detalles si es aplicable.
   */
  async validateCode(code: string, tenantId: string, currentPlanCode?: string) {
    if (!code) {
      throw new BadRequestException('El código de referido no puede estar vacío.');
    }

    // Buscar código (insensible a mayúsculas/minúsculas)
    const referralCode = await this.prisma.referralCode.findFirst({
      where: {
        code: {
          equals: code.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (!referralCode) {
      throw new NotFoundException(`El código de descuento "${code}" no existe.`);
    }

    // 1. Validar si está activo
    if (!referralCode.active) {
      throw new BadRequestException('Este código de descuento ya no está activo.');
    }

    // 2. Validar expiración
    if (referralCode.expiresAt && new Date() > referralCode.expiresAt) {
      throw new BadRequestException('Este código de descuento ha expirado.');
    }

    // 3. Validar límite de usos totales
    if (referralCode.maxUses !== null && referralCode.usesCount >= referralCode.maxUses) {
      throw new BadRequestException('Este código de descuento ha alcanzado el límite máximo de usos.');
    }

    // 4. Validar auto-referido
    if (referralCode.referrerTenantId === tenantId) {
      throw new BadRequestException('No puedes utilizar tu propio código de referido para obtener un descuento.');
    }

    // 5. Validar plan específico si aplica
    if (referralCode.applicablePlanCode && currentPlanCode) {
      if (referralCode.applicablePlanCode.toUpperCase() !== currentPlanCode.toUpperCase()) {
        throw new BadRequestException(
          `Este cupón sólo es válido para el plan ${referralCode.applicablePlanCode}.`
        );
      }
    }

    // Obtener información del tenant actual para validaciones de tiempo/facturas
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: {
            invoices: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('El tenant especificado no existe.');
    }

    // 6. Validar ventana de 14 días desde registro (solo para códigos de usuarios)
    if (!referralCode.isSystem) {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      if (tenant.createdAt < fourteenDaysAgo) {
        throw new BadRequestException(
          'Los códigos de referidos de usuarios sólo pueden aplicarse en los primeros 14 días desde tu registro.'
        );
      }
    }

    // 7. Validar regla de primer pago
    if (referralCode.onlyFirstPayment) {
      const hasPaidInvoice = tenant.subscription?.invoices.some(
        (invoice) => invoice.status === 'PAID'
      );
      if (hasPaidInvoice) {
        throw new BadRequestException(
          'Este descuento de bienvenida sólo puede ser aplicado en tu primer pago de suscripción.'
        );
      }
    }

    // 8. Validar si ya usó ESTE código
    const alreadyUsedThisCode = await this.prisma.referralUsage.findFirst({
      where: {
        referralCodeId: referralCode.id,
        tenantId,
      },
    });

    if (alreadyUsedThisCode) {
      throw new BadRequestException('Ya has aplicado este código de descuento anteriormente.');
    }

    // 9. Validar si ya usó CUALQUIER código de usuario (límite de 1 código de usuario en la vida útil)
    if (!referralCode.isSystem) {
      const usedUserReferralBefore = await this.prisma.referralUsage.findFirst({
        where: {
          tenantId,
          referralCode: {
            isSystem: false,
          },
        },
      });

      if (usedUserReferralBefore) {
        throw new BadRequestException(
          'Sólo puedes beneficiarte de un código de referido de usuario una única vez.'
        );
      }
    }

    // 10. Validación de Bucle de Referidos Circular de cualquier longitud (A -> B -> C -> A)
    if (referralCode.referrerTenantId) {
      let currentReferrer = referralCode.referrerTenantId;
      let depth = 0;
      const maxDepth = 10;

      while (currentReferrer && depth < maxDepth) {
        if (currentReferrer === tenantId) {
          throw new BadRequestException(
            'No puedes usar este código porque formaría un bucle de referidos circular.'
          );
        }

        // Buscar a quién refirió a currentReferrer
        const usage = await this.prisma.referralUsage.findFirst({
          where: { tenantId: currentReferrer },
          include: { referralCode: true },
        });

        if (usage && usage.referralCode.referrerTenantId) {
          currentReferrer = usage.referralCode.referrerTenantId;
          depth++;
        } else {
          break;
        }
      }
    }

    return {
      valid: true,
      id: referralCode.id,
      code: referralCode.code,
      discountPercent: Number(referralCode.discountPercent),
      isSystem: referralCode.isSystem,
      applicablePlanCode: referralCode.applicablePlanCode,
    };
  }

  /**
   * Obtiene o genera un código de referido único para el usuario.
   */
  async getOrCreateUserCode(userId: string, tenantId: string) {
    const tenantSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!tenantSub || tenantSub.plan.code === 'STARTER') {
      throw new ForbiddenException(
        'El programa de referidos sólo está disponible para planes de pago (Pro o superior).'
      );
    }

    // Buscar si ya existe
    let referralCode = await this.prisma.referralCode.findFirst({
      where: { referrerId: userId },
    });

    if (referralCode) {
      // Obtener estadísticas de uso detalladas
      const usages = await this.prisma.referralUsage.findMany({
        where: { referralCodeId: referralCode.id },
        include: {
          invoice: {
            include: {
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          },
        },
      });

      const totalDaysEarned = usages.reduce((acc, usage) => acc + (usage.rewardedDays || 0), 0);

      return {
        code: referralCode.code,
        discountPercent: Number(referralCode.discountPercent),
        totalReferrals: usages.length,
        benefitsEarned: `${totalDaysEarned} días gratis acumulados`,
      };
    }

    // Obtener datos del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('El usuario especificado no existe.');
    }

    // Sanitizar primer nombre del usuario para el código (solo letras y números)
    const rawName = user.firstName
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^A-Z0-9]/g, '');      // Quitar todo lo que no sea letra o número

    const cleanName = rawName.length >= 3 ? rawName.substring(0, 10) : 'REFERIDO';

    // Generar código único
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      code = `${cleanName}-${randomSuffix}`;
      attempts++;

      // Validar si el código resultante contiene palabras prohibidas o inapropiadas
      const containsForbidden = RESERVED_WORDS_BLACKLIST.some((forbidden) => code.includes(forbidden));
      if (containsForbidden || ProfanityFilter.isProfane(code)) {
        continue;
      }

      // Validar unicidad en DB
      const existing = await this.prisma.referralCode.findUnique({
        where: { code },
      });

      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      // Fallback si tras 10 intentos no es único
      code = `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    }

    // Crear código de referido con 10% de descuento por defecto para invitados
    referralCode = await this.prisma.referralCode.create({
      data: {
        code,
        discountPercent: 10.00,
        isSystem: false,
        onlyFirstPayment: true,
        referrerId: userId,
        referrerTenantId: tenantId,
      },
    });

    return {
      code: referralCode.code,
      discountPercent: Number(referralCode.discountPercent),
      totalReferrals: 0,
      benefitsEarned: '0 días gratis acumulados',
    };
  }

  /**
   * Personaliza el código de referido del usuario.
   */
  async updateMyCode(userId: string, newCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('El usuario especificado no existe.');
    }

    const tenantSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: user.tenantId },
      include: { plan: true },
    });

    if (!tenantSub || tenantSub.plan.code === 'STARTER') {
      throw new ForbiddenException(
        'El programa de referidos sólo está disponible para planes de pago (Pro o superior).'
      );
    }

    if (!newCode) {
      throw new BadRequestException('El código no puede estar vacío.');
    }

    const code = newCode.trim().toUpperCase();

    // 1. Validar Regex: ^[A-Z0-9-]{5,15}$
    const regex = /^[A-Z0-9-]{5,15}$/;
    if (!regex.test(code)) {
      throw new BadRequestException(
        'El código debe tener entre 5 y 15 caracteres y contener sólo letras mayúsculas, números y guiones.'
      );
    }

    // 2. Validar Lista Negra
    const containsReserved = RESERVED_WORDS_BLACKLIST.some((word) => code.includes(word));
    if (containsReserved) {
      throw new BadRequestException('No puedes utilizar este código.');
    }

    // 3. Filtro de Profanidades (Español / Inglés)
    if (ProfanityFilter.isProfane(code)) {
      throw new BadRequestException('No puedes utilizar este código.');
    }

    // 4. Validar unicidad (ignorar si es el propio del usuario)
    const existing = await this.prisma.referralCode.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      if (existing.referrerId === userId) {
        // Ya es suyo, no hacer nada
        return this.getOrCreateUserCode(userId, existing.referrerTenantId);
      }
      throw new BadRequestException('Este código ya está en uso por otro usuario.');
    }

    // Buscar el código actual del usuario
    const currentCode = await this.prisma.referralCode.findFirst({
      where: { referrerId: userId },
    });

    if (!currentCode) {
      throw new NotFoundException('No tienes ningún código de referido activo para personalizar.');
    }

    // Actualizar el código
    await this.prisma.referralCode.update({
      where: { id: currentCode.id },
      data: { code },
    });

    return this.getOrCreateUserCode(userId, currentCode.referrerTenantId);
  }
}
