import { Component, OnInit, signal, inject, computed, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '@core/services/subscription.service';
import { SnackbarService } from '@core/services/snackbar.service';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-plans-grid',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './plans-grid.component.html',
})
export class PlansGridComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private snackbar = inject(SnackbarService);

  @Input() mode: 'direct' | 'selection' = 'direct';
  @Output() planSelected = new EventEmitter<any>();

  // Estado
  isLoading = signal(true);
  isProcessing = signal(false);
  plans = signal<any[]>([]);
  billingCycle = signal<'MONTHLY' | 'YEARLY'>('MONTHLY');
  
  // Computed
  activePlanId = computed(() => {
    const status = this.subscriptionService.status();
    // Si estamos en modo selección (checkout), no marcamos el plan como deshabilitado para permitir extenderlo
    if (this.mode === 'selection') return null;
    // Si no hay status o estamos en trial, no marcamos ningún plan como "Actual" para permitir la compra
    if (!status || status.isTrial) return null;
    return this.plans().find(p => p.code === status.plan.code)?.id || null;
  });

  currentPlanCode = computed(() => {
    const status = this.subscriptionService.status();
    if (!status || status.isTrial) return null;
    return status.plan.code;
  });

  isYearly = computed(() => this.billingCycle() === 'YEARLY');
  paymentsEnabled = computed(() => this.subscriptionService.paymentsEnabled());

  getPlanRank(code: string): number {
    const ranks: Record<string, number> = {
      STARTER: 0,
      PRO: 1,
      BUSINESS: 2,
      ELITE: 3
    };
    return ranks[code] ?? 0;
  }

  isDowngrade(planCode: string): boolean {
    const currentCode = this.currentPlanCode();
    if (!currentCode) return false;
    return this.getPlanRank(planCode) < this.getPlanRank(currentCode);
  }

  ngOnInit() {
    this.subscriptionService.loadConfig();
    this.loadPlans();
  }

  async loadPlans() {
    this.isLoading.set(true);
    try {
      const data = await this.subscriptionService.getPlans();
      // Filtrar Starter si viene, ordenar por precio
      this.plans.set(data.filter(p => p.code !== 'STARTER').sort((a, b) => Number(a.priceMonthly) - Number(b.priceMonthly)));
    } catch (error) {
      this.snackbar.error('Error al cargar los planes disponibles.');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleBillingCycle() {
    this.billingCycle.set(this.billingCycle() === 'MONTHLY' ? 'YEARLY' : 'MONTHLY');
  }

  async subscribe(planId: string) {
    const selectedPlan = this.plans().find(p => p.id === planId);
    
    if (this.mode === 'selection') {
      this.planSelected.emit(selectedPlan);
      return;
    }

    if (this.isProcessing()) return;
    
    this.isProcessing.set(true);
    try {
      const result = await this.subscriptionService.checkout(planId, this.billingCycle());
      if (result.initPoint) {
        window.location.href = result.initPoint;
      }
    } catch (error: any) {
      this.snackbar.error(error?.error?.message || 'Error al iniciar la suscripción. Intenta nuevamente.');
      this.isProcessing.set(false);
    }
  }

  getFeatures(planCode: string): { text: string; included: boolean }[] {
    switch (planCode) {
      case 'PRO':
        return [
          { text: 'Turnos Ilimitados', included: true },
          { text: 'Pagos online con Mercado Pago', included: true },
          { text: 'Reseñas Automáticas (Email)', included: true },
          { text: '1 Profesional / 1 Sucursal', included: true },
          { text: 'Reportes y métricas', included: true },
          { text: '100 Mensajes de WhatsApp/mes', included: true },
        ];
      case 'BUSINESS':
        return [
          { text: 'Turnos Ilimitados', included: true },
          { text: 'Pagos online con Mercado Pago', included: true },
          { text: 'Reseñas por Email o WhatsApp', included: true },
          { text: 'Hasta 5 Profesionales', included: true },
          { text: 'Hasta 3 Sucursales', included: true },
          { text: '300 Mensajes de WhatsApp/mes', included: true },
        ];
      case 'ELITE':
        return [
          { text: 'Todo Ilimitado (Turnos, Prof, Suc.)', included: true },
          { text: 'Pagos online con Mercado Pago', included: true },
          { text: 'Reseñas Automáticas', included: true },
          { text: 'WhatsApp con remitente propio', included: true },
          { text: 'Templates personalizados', included: true },
          { text: '1.000 Mensajes de WhatsApp/mes', included: true },
        ];
      default:
        return [];
    }
  }
}
