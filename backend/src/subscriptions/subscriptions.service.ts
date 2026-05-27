import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ConfigService } from '@nestjs/config';
import { WHATSAPP_PACKS } from './constants/whatsapp-packs';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadopagoService: MercadoPagoService,
    private readonly configService: ConfigService,
  ) { }

  async onModuleInit() {
    // No-op: La sincronización de planes con Mercado Pago está desactivada porque se utiliza Checkout Directo (Preferences).
  }

  /**
   * Obtiene y si es necesario resetea la configuración de WhatsApp para un tenant
   */
  private async getOrResetWhatsappConfig(tenantId: string) {
    let config = await this.prisma.tenantWhatsappConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      config = await this.prisma.tenantWhatsappConfig.create({
        data: {
          tenantId,
          verified: false,
          messagesSentMonth: 0,
          lastResetDate: new Date(),
        },
      });
    } else {
      const now = new Date();
      const lastReset = new Date(config.lastResetDate);
      const nextReset = new Date(lastReset);
      nextReset.setMonth(nextReset.getMonth() + 1);

      if (now >= nextReset) {
        let newResetDate = nextReset;
        while (true) {
          const nextMonth = new Date(newResetDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          if (now < nextMonth) {
            break;
          }
          newResetDate = nextMonth;
        }

        this.logger.log(`Reseteando uso mensual de WhatsApp para el tenant ${tenantId}. Próximo reinicio: ${newResetDate.toISOString()}`);

        config = await this.prisma.tenantWhatsappConfig.update({
          where: { tenantId },
          data: {
            messagesSentMonth: 0,
            lastResetDate: newResetDate,
          },
        });
      }
    }

    return config;
  }

  /**
   * Obtiene el estado detallado de la suscripción de un tenant
   */
  async getSubscriptionStatus(tenantId: string) {
    let sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!sub) {
      // Intentar auto-asignar plan STARTER si no tiene ninguno (Fix para legacy data o errores en registro)
      const starterPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { code: 'STARTER' }
      });

      if (!starterPlan) {
        this.logger.error(`No se encontró el plan STARTER en la DB para el tenant ${tenantId}`);
        throw new NotFoundException('No se encontró información de suscripción para este negocio.');
      }

      sub = await this.prisma.tenantSubscription.create({
        data: {
          tenantId,
          planId: starterPlan.id,
          status: 'ACTIVE',
        },
        include: { plan: true }
      });

      this.logger.log(`Auto-asignado plan STARTER a tenant ${tenantId} por falta de registro previo.`);
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

    const whatsappConfig = await this.getOrResetWhatsappConfig(tenantId);
    const whatsappMonth = whatsappConfig ? whatsappConfig.messagesSentMonth : 0;

    const now = new Date();
    
    // Calcular balance de mensajes extras activos (FIFO)
    const activePacks = await this.prisma.tenantWhatsappPack.findMany({
      where: {
        tenantId,
        remaining: { gt: 0 },
        expiresAt: { gt: now }
      },
      orderBy: { expiresAt: 'asc' }
    });
    const extraWhatsappBalance = activePacks.reduce((acc, p) => acc + p.remaining, 0);
    const extraWhatsappTotal = activePacks.reduce((acc, p) => acc + p.quantity, 0);

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
      endDate: sub.endDate,
      trialDaysRemaining,
      isTrial: sub.status === 'TRIALING',
      isActive: sub.status === 'ACTIVE' || (sub.status === 'TRIALING' && trialDaysRemaining > 0),
      limits: {
        maxProfessionals: sub.plan.maxProfessionals,
        maxBranches: sub.plan.maxBranches,
        maxAppointments: sub.plan.maxAppointments,
        maxUsers: sub.plan.maxUsers,
        maxWhatsapp: sub.plan.maxWhatsapp,
        hasReports: sub.plan.hasReports,
        hasOnlinePayments: sub.plan.hasOnlinePayments,
        hasAutoReviews: sub.plan.hasAutoReviews,
      },
      usage: {
        professionals: profCount,
        branches: branchCount,
        users: userCount,
        appointmentsMonth: apptCount,
        whatsappMonth: whatsappMonth,
        extraWhatsappBalance,
        extraWhatsappTotal,
      },
      activePacks: activePacks.map(p => ({
        id: p.id,
        quantity: p.quantity,
        remaining: p.remaining,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt
      })),
    };
  }

  /**
   * Valida si un tenant puede realizar una acción basada en sus límites
   * @throws ForbiddenException si se excede el límite
   */
  async validateLimit(tenantId: string, feature: 'PROFESSIONALS' | 'BRANCHES' | 'APPOINTMENTS' | 'USERS' | 'WHATSAPP') {
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

      case 'WHATSAPP':
        if (status.limits.maxWhatsapp <= 0) {
          throw new ForbiddenException(`Tu plan ${status.plan.name} no incluye mensajes de WhatsApp.`);
        }

        const wConfig = await this.getOrResetWhatsappConfig(tenantId);
        const wCount = wConfig ? wConfig.messagesSentMonth : 0;

        // Sumar saldo extra disponible de paquetes activos (FIFO)
        const activePacks = await this.prisma.tenantWhatsappPack.findMany({
          where: {
            tenantId,
            remaining: { gt: 0 },
            expiresAt: { gt: new Date() }
          }
        });
        const extraBalance = activePacks.reduce((acc, p) => acc + p.remaining, 0);

        if (wCount >= status.limits.maxWhatsapp && extraBalance <= 0) {
          throw new ForbiddenException(`Has alcanzado el límite de mensajes de WhatsApp mensuales (${status.limits.maxWhatsapp}) y no tienes saldo de mensajes extras para tu plan ${status.plan.name}.`);
        }
        break;
    }

    return true;
  }

  /**
   * Crea un link de pago (suscripción) para el plan seleccionado.
   */
  async createCheckout(userId: string, planCode: string, billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY', quantity: number = 1) {
    if (!this.isPaymentsEnabled()) {
      throw new ForbiddenException('Los pagos online están temporalmente fuera de servicio.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          { id: planCode },
          { code: planCode }
        ]
      }
    });

    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (plan.code === 'STARTER') throw new ForbiddenException('No puedes comprar el plan Starter, es gratuito.');

    // Obtener la suscripción actual del tenant para calcular crédito si hay un cambio de plan
    const currentSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: user.tenantId },
      include: { plan: true }
    });

    let credit = 0;
    const now = new Date();
    const isPlanChange = currentSub && currentSub.status === 'ACTIVE' && currentSub.plan.code !== plan.code;

    if (isPlanChange && currentSub.endDate && currentSub.endDate > now) {
      const remainingTime = currentSub.endDate.getTime() - now.getTime();
      const remainingDays = Math.max(0, remainingTime / (1000 * 60 * 60 * 24));
      
      // Calcular precio diario del plan actual
      const currentPlanPrice = currentSub.billingCycle === 'MONTHLY' 
        ? Number(currentSub.plan.priceMonthly) 
        : Number(currentSub.plan.priceYearly);
      const currentPlanPeriodDays = currentSub.billingCycle === 'MONTHLY' ? 30 : 365;
      const currentDailyPrice = currentPlanPrice / currentPlanPeriodDays;
      
      credit = Math.round(remainingDays * currentDailyPrice);
    }

    const finalQuantity = billingCycle === 'YEARLY' ? 1 : quantity;
    const planPrice = billingCycle === 'MONTHLY' ? Number(plan.priceMonthly) : Number(plan.priceYearly);
    const baseAmount = planPrice * finalQuantity;
    const amountToCharge = Math.max(10, baseAmount - credit); // Mínimo de 10 ARS para evitar errores de MP

    this.logger.log(`Iniciando checkout para tenant ${user.tenantId}. Plan: ${plan.code} (${billingCycle}). Crédito: ${credit}. Total: ${amountToCharge}.`);

    // Priorizamos la URL del túnel (HTTPS) si está configurada, para que Mercado Pago permita el auto_return
    const baseUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:4200';
    const backUrl = `${baseUrl}/dashboard/subscription/success`;

    const externalReference = `${user.tenantId}:${plan.code}:${billingCycle}:${finalQuantity}`;

    const preference = await this.mercadopagoService.createPreference({
      title: isPlanChange 
        ? `Axenda - Upgrade a Plan ${plan.name} (${billingCycle === 'MONTHLY' ? 'Mes' : 'Año'})`
        : `Axenda - Plan ${plan.name} (${billingCycle === 'MONTHLY' ? 'Mes' : 'Año'})`,
      amount: amountToCharge,
      quantity: 1, // Usamos cantidad 1 ya que el precio ya contempla la multiplicación y el crédito prorrateado
      externalReference: externalReference,
      backUrl: backUrl,
      payerEmail: user.email,
    });

    return {
      initPoint: preference.init_point
    };
  }

  async createPackCheckout(userId: string, packCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const pack = WHATSAPP_PACKS[packCode as keyof typeof WHATSAPP_PACKS];
    if (!pack) throw new BadRequestException('Paquete de WhatsApp no válido');

    this.logger.log(`Iniciando checkout de pack para tenant ${user.tenantId}. Pack: ${packCode} ($${pack.price}).`);

    const baseUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:4200';
    const backUrl = `${baseUrl}/dashboard/subscription/success`;

    const externalReference = `${user.tenantId}:${packCode}:ONETIME:1`;

    const preference = await this.mercadopagoService.createPreference({
      title: `Axenda - ${pack.name}`,
      amount: pack.price,
      quantity: 1,
      externalReference: externalReference,
      backUrl: backUrl,
      payerEmail: user.email,
    });

    return {
      initPoint: preference.init_point
    };
  }

  /**
   * Verifica activamente con Mercado Pago el estado de un pago manual
   * (Defensa proactiva cuando el usuario vuelve del checkout)
   */
  async verifySubscription(tenantId: string, paymentId: string) {
    try {
      this.logger.log(`Verificación proactiva de pago iniciada para tenant ${tenantId}, pago ${paymentId}`);

      const payment = await this.mercadopagoService.getPayment(paymentId);
      
      // Procesamos el pago y obtenemos el resultado
      const result = await this.handleMercadoPagoPayment(payment, tenantId);

      return { 
        success: true, 
        status: result?.status || payment.status 
      };
    } catch (error) {
      this.logger.error(`Error en verificación de pago para tenant ${tenantId}`, error);
      throw new Error('No se pudo verificar el pago en este momento.');
    }
  }

  /**
   * @deprecated Los planes recurrentes de Mercado Pago no se utilizan ya que implementamos Checkout Directo (Preferences).
   */
  async syncPlansWithMercadoPago(forceReset = false) {
    this.logger.warn('⚠️ syncPlansWithMercadoPago fue llamada pero está obsoleta (se utiliza Checkout Directo).');
    return { success: true, syncedPlans: 0, deprecated: true };
  }

  /**
   * Procesa un pago manual (Preferencia) de Mercado Pago
   */
  async handleMercadoPagoPayment(mpPayment: any, providedTenantId?: string) {
    this.logger.log(`Procesando pago de MP: ${mpPayment.id}. Status: ${mpPayment.status}`);

    let tenantId = providedTenantId;
    let planCode: string | undefined;
    let billingCycle: string | undefined;
    let quantity: number = 1;

    // 1. Identificamos la información vía external_reference (tenantId:planCode:billingCycle:quantity)
    if (mpPayment.external_reference) {
      const parts = mpPayment.external_reference.split(':');
      if (parts.length >= 1) tenantId = parts[0];
      if (parts.length >= 2) planCode = parts[1];
      if (parts.length >= 3) billingCycle = parts[2];
      if (parts.length >= 4) quantity = parseInt(parts[3]) || 1;
    }

    if (!tenantId) {
      this.logger.warn(`No se pudo identificar el tenant para el pago de MP: ${mpPayment.id}. Ignorando.`);
      return;
    }

    // Solo procesamos si el pago está aprobado
    if (mpPayment.status !== 'approved') {
      this.logger.log(`El pago ${mpPayment.id} no está aprobado (${mpPayment.status}). No se actualiza la suscripción.`);
      return;
    }

    // Evitar doble procesamiento si ya existe factura registrada para este id de pago
    const existingInvoice = await this.prisma.subscriptionInvoice.findFirst({
      where: {
        externalPaymentId: mpPayment.id.toString(),
        status: 'PAID'
      }
    });

    if (existingInvoice) {
      this.logger.log(`El pago de MP ${mpPayment.id} ya fue procesado previamente. Ignorando.`);
      return {
        status: mpPayment.status,
        tenantId
      };
    }

    // Obtenemos la suscripción actual del tenant
    const currentSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true }
    });

    if (!currentSub) {
      this.logger.error(`No se encontró registro de suscripción para el tenant ${tenantId}`);
      return;
    }

    // Si el planCode es un paquete de WhatsApp
    if (planCode && planCode.startsWith('WPP_PACK_')) {
      const pack = WHATSAPP_PACKS[planCode as keyof typeof WHATSAPP_PACKS];
      if (!pack) {
        this.logger.error(`Paquete de WhatsApp no válido en pago de MP: ${planCode}`);
        return;
      }

      if (mpPayment.status === 'approved') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 3); // 3 meses de validez

        this.logger.log(`Acreditando ${pack.quantity} mensajes de WhatsApp para el tenant ${tenantId}. Expira el ${expiresAt.toISOString()}`);

        await this.prisma.$transaction([
          this.prisma.tenantWhatsappPack.create({
            data: {
              tenantId,
              quantity: pack.quantity,
              remaining: pack.quantity,
              expiresAt,
            }
          }),
          this.prisma.subscriptionInvoice.create({
            data: {
              subscriptionId: currentSub.id,
              amount: mpPayment.transaction_amount || pack.price,
              currency: mpPayment.currency_id || 'ARS',
              status: 'PAID',
              paymentDate: new Date(),
              externalPaymentId: mpPayment.id.toString(),
              billingPeriodStart: new Date(),
              billingPeriodEnd: expiresAt,
              description: pack.name,
            }
          })
        ]);

        this.logger.log(`Paquete de WhatsApp acreditado exitosamente para el tenant ${tenantId}.`);
      }

      return {
        status: mpPayment.status,
        tenantId
      };
    }

    // Buscamos el plan que el usuario pagó (si viene en la referencia)
    let planIdToApply = currentSub.planId;
    let cycleToApply = (billingCycle as any) || currentSub.billingCycle;
    let planNameToUse = currentSub.plan.name;

    if (planCode) {
      const targetPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { code: planCode }
      });
      if (targetPlan) {
        planIdToApply = targetPlan.id;
        planNameToUse = targetPlan.name;
      }
    }

    // Determinamos cuánto tiempo extender
    const now = new Date();
    const isPlanChange = planCode && planCode !== currentSub.plan.code;
    let newEndDate = (!isPlanChange && currentSub.endDate && currentSub.endDate > now) 
      ? new Date(currentSub.endDate) 
      : new Date(now);

    if (cycleToApply === 'MONTHLY') {
      newEndDate.setMonth(newEndDate.getMonth() + quantity);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + quantity);
    }

    // Solo activamos/extendemos si el pago está aprobado
    if (mpPayment.status === 'approved') {
      this.logger.log(`Extendiendo suscripción del tenant ${tenantId} al plan ${planCode || 'actual'} (${cycleToApply}) x${quantity} hasta ${newEndDate.toISOString()}`);

      await this.prisma.$transaction([
        this.prisma.tenantSubscription.update({
          where: { tenantId },
          data: {
            planId: planIdToApply,
            status: 'ACTIVE',
            billingCycle: cycleToApply,
            endDate: newEndDate,
            trialEndsAt: null,
            externalSubscriptionId: mpPayment.id.toString(),
          }
        }),
        this.prisma.subscriptionInvoice.create({
          data: {
            subscriptionId: currentSub.id,
            amount: mpPayment.transaction_amount,
            currency: mpPayment.currency_id || 'ARS',
            status: 'PAID',
            paymentDate: new Date(),
            externalPaymentId: mpPayment.id.toString(),
            billingPeriodStart: now,
            billingPeriodEnd: newEndDate,
            description: `Plan ${planNameToUse} (${cycleToApply === 'MONTHLY' ? 'Mensual' : 'Anual'})`,
          }
        })
      ]);
      this.logger.log(`Suscripción del tenant ${tenantId} actualizada exitosamente.`);
    } else {
      this.logger.log(`Pago de MP ${mpPayment.id} recibido con estado: ${mpPayment.status}. No se requiere acción inmediata.`);
    }

    return {
      status: mpPayment.status,
      tenantId
    };
  }

  /**
   * Obtiene el historial de facturas (pagos) de la suscripción del tenant
   */
  async getSubscriptionInvoices(tenantId: string) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });

    if (!sub) {
      return [];
    }

    return this.prisma.subscriptionInvoice.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { createdAt: 'desc' }
    });
  }

  isPaymentsEnabled(): boolean {
    return this.configService.get<boolean>('PAYMENTS_ENABLED') === true;
  }

  /**
   * Deprecated: Manejo de suscripciones recurrentes de MP
   */
  async handleMercadoPagoSubscriptionUpdate(mpSubscription: any, providedTenantId?: string) {
    this.logger.warn('Llamada a handleMercadoPagoSubscriptionUpdate (Deprecated).');
  }
}
