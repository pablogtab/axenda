import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PlansGridComponent } from './plans-grid.component';
import { SubscriptionService } from '../../../core/services/subscription.service';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  code: string;
}

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, PlansGridComponent],
  template: `
    <div class="h-full overflow-y-auto bg-[#0a0b14] text-white p-4 md:p-8 custom-scrollbar">
      <!-- Header / Progress -->
      <div class="max-w-6xl mx-auto mb-12">
        <div class="flex items-center justify-between mb-8">
          <button routerLink="/dashboard/settings" [queryParams]="{section: 'billing'}" 
            class="flex items-center gap-2 text-text-muted hover:text-white transition-colors group">
            <app-icon name="arrow_back" class="group-hover:-translate-x-1 transition-transform"></app-icon>
            <span class="text-sm font-bold">Volver a Configuracion</span>
          </button>
          
          <div class="hidden md:flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                [class.bg-primary]="currentStep() >= 1" [class.bg-surface-subtle]="currentStep() < 1">1</span>
              <span class="text-xs font-bold uppercase tracking-widest" [class.text-primary]="currentStep() === 1" [class.text-text-muted]="currentStep() !== 1">Elegir Plan</span>
            </div>
            <div class="w-8 h-[2px] bg-surface-subtle"></div>
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                [class.bg-primary]="currentStep() >= 2" [class.bg-surface-subtle]="currentStep() < 2">2</span>
              <span class="text-xs font-bold uppercase tracking-widest" [class.text-primary]="currentStep() === 2" [class.text-text-muted]="currentStep() !== 2">Ciclo de Facturacion</span>
            </div>
            <div class="w-8 h-[2px] bg-surface-subtle"></div>
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                [class.bg-primary]="currentStep() >= 3" [class.bg-surface-subtle]="currentStep() < 3">3</span>
              <span class="text-xs font-bold uppercase tracking-widest" [class.text-primary]="currentStep() === 3" [class.text-text-muted]="currentStep() !== 3">Confirmar y Pagar</span>
            </div>
          </div>
        </div>

        <div class="text-center md:text-left">
          <h1 class="text-4xl md:text-5xl font-black tracking-tighter mb-4">
            {{ stepTitle() }}
          </h1>
          <p class="text-lg text-text-muted max-w-2xl">
            {{ stepDescription() }}
          </p>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-7xl mx-auto">
        <!-- Step 1: Choose Plan -->
        <div *ngIf="currentStep() === 1" class="animate-in fade-in slide-in-from-bottom-8 duration-700">
           <app-plans-grid mode="selection" (planSelected)="onPlanSelected($event)"></app-plans-grid>
        </div>

        <!-- Step 2: Choose Cycle -->
        <div *ngIf="currentStep() === 2" class="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <!-- Monthly -->
            <div (click)="setCycle('MONTHLY')" 
              class="glass p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all group relative overflow-hidden"
              [class.border-primary]="billingCycle() === 'MONTHLY'"
              [class.border-border]="billingCycle() !== 'MONTHLY'">
              <div class="relative z-10">
                <div class="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <app-icon name="calendar_view_month" class="text-2xl text-text-dim"></app-icon>
                </div>
                <h3 class="text-2xl font-black mb-2">Mensual</h3>
                <p class="text-text-muted text-sm mb-6">Paga mes a mes. Ideal para probar la plataforma sin compromisos a largo plazo.</p>
                <div class="text-3xl font-black text-white">
                  $ {{ selectedPlan()?.priceMonthly }} <span class="text-sm font-normal text-text-muted">/mes</span>
                </div>
              </div>
              <div *ngIf="billingCycle() === 'MONTHLY'" class="absolute top-6 right-6">
                <app-icon name="check_circle" class="text-primary text-2xl"></app-icon>
              </div>
            </div>

            <!-- Yearly -->
            <div (click)="setCycle('YEARLY')" 
              class="glass p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all group relative overflow-hidden"
              [class.border-primary]="billingCycle() === 'YEARLY'"
              [class.border-border]="billingCycle() !== 'YEARLY'">
              
              <div class="absolute -right-12 top-8 rotate-45 bg-emerald-500 text-white text-[10px] font-black py-1 px-12 shadow-lg">
                AHORRA 20%
              </div>

              <div class="relative z-10">
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <app-icon name="calendar_today" class="text-2xl text-emerald-500"></app-icon>
                </div>
                <h3 class="text-2xl font-black mb-2">Anual</h3>
                <p class="text-text-muted text-sm mb-6">Un unico pago al año. La mejor opcion para negocios establecidos.</p>
                <div class="text-3xl font-black text-white">
                  $ {{ selectedPlan()?.priceYearly }} <span class="text-sm font-normal text-text-muted">/año</span>
                </div>
                <p class="text-emerald-400 text-xs font-bold mt-2">Equivale a $ {{ ((selectedPlan()?.priceYearly || 0) / 12) | number:'1.0-0' }}/mes</p>
              </div>
              <div *ngIf="billingCycle() === 'YEARLY'" class="absolute top-6 right-6">
                <app-icon name="check_circle" class="text-primary text-2xl"></app-icon>
              </div>
            </div>
          </div>

          <div class="flex justify-center mt-12 gap-4">
            <button (click)="currentStep.set(1)" class="px-8 py-4 bg-surface-subtle hover:bg-white/10 rounded-2xl font-bold transition-all">
              Atras
            </button>
            <button (click)="currentStep.set(3)" [disabled]="!billingCycle()"
              class="px-12 py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black shadow-xl shadow-primary/20 transition-all disabled:opacity-50">
              Continuar
            </button>
          </div>
        </div>

        <!-- Step 3: Review & Pay -->
        <div *ngIf="currentStep() === 3" class="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="glass p-8 md:p-12 rounded-[3rem] border border-border relative overflow-hidden">
            <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full"></div>

            <div class="relative z-10">
              <h3 class="text-xs font-black text-primary uppercase tracking-[0.3em] mb-8">Resumen de tu suscripcion</h3>
              
              <div class="space-y-6 mb-12">
                <div class="flex justify-between items-end">
                  <div>
                    <span class="text-text-muted text-xs block mb-1">Plan Seleccionado</span>
                    <span class="text-2xl font-black text-white">{{ selectedPlan()?.name }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-text-muted text-xs block mb-1">Ciclo</span>
                    <span class="text-lg font-bold text-white">{{ billingCycle() === 'MONTHLY' ? 'Mensual' : 'Anual' }}</span>
                  </div>
                </div>

                <div class="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-text-muted">Precio del plan</span>
                    <span class="text-sm font-bold text-white">$ {{ billingCycle() === 'MONTHLY' ? selectedPlan()?.priceMonthly : selectedPlan()?.priceYearly }}</span>
                  </div>
                  <div class="flex justify-between items-center text-emerald-400" *ngIf="billingCycle() === 'YEARLY'">
                    <span class="text-xs">Descuento Anual (20%)</span>
                    <span class="text-xs font-bold">Incluido</span>
                  </div>
                  <div class="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                    <span class="text-lg font-bold">Total a pagar hoy</span>
                    <span class="text-3xl font-black text-white">$ {{ billingCycle() === 'MONTHLY' ? selectedPlan()?.priceMonthly : selectedPlan()?.priceYearly }}</span>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <button (click)="processPayment()" [disabled]="isProcessing()"
                  class="w-full py-5 bg-primary hover:bg-primary-hover text-white rounded-[1.5rem] font-black text-lg shadow-2xl shadow-primary/40 transition-all flex items-center justify-center gap-3">
                  <span *ngIf="!isProcessing()">Ir a Pagar con Mercado Pago</span>
                  <div *ngIf="isProcessing()" class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <app-icon *ngIf="!isProcessing()" name="arrow_forward"></app-icon>
                </button>
                <button (click)="currentStep.set(2)" class="w-full py-4 text-text-muted hover:text-white font-bold transition-all">
                  Cambiar ciclo de facturacion
                </button>
              </div>

              <p class="mt-8 text-[10px] text-text-dim text-center leading-relaxed">
                Al hacer clic en "Ir a Pagar", seras redirigido a Mercado Pago para completar la transaccion de forma segura. 
                Podras cancelar tu suscripcion en cualquier momento desde la configuracion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
  `]
})
export class SubscriptionPlansComponent implements OnInit {
  currentStep = signal(1);
  selectedPlan = signal<Plan | null>(null);
  billingCycle = signal<'MONTHLY' | 'YEARLY'>('MONTHLY');
  isProcessing = signal(false);

  private subService = inject(SubscriptionService);

  ngOnInit() {}

  stepTitle() {
    switch (this.currentStep()) {
      case 1: return 'Elegi el plan ideal';
      case 2: return '¿Como preferis pagar?';
      case 3: return 'Revisa tu pedido';
      default: return '';
    }
  }

  stepDescription() {
    switch (this.currentStep()) {
      case 1: return 'Selecciona el plan que mejor se adapte al tamaño de tu negocio y equipo.';
      case 2: return 'Ahorra hasta un 20% eligiendo el pago anual, o mantene la flexibilidad del pago mensual.';
      case 3: return 'Estas a un paso de potenciar tu negocio con Axenda. Verifica que todo este correcto.';
      default: return '';
    }
  }

  onPlanSelected(plan: any) {
    this.selectedPlan.set(plan);
    this.currentStep.set(2);
  }

  setCycle(cycle: 'MONTHLY' | 'YEARLY') {
    this.billingCycle.set(cycle);
  }

  async processPayment() {
    const plan = this.selectedPlan();
    if (!plan) return;

    this.isProcessing.set(true);
    try {
      const res = await this.subService.checkout(plan.id, this.billingCycle());
      if (res.initPoint) {
        window.location.href = res.initPoint;
      }
    } catch (error) {
      console.error('Error in checkout:', error);
      this.isProcessing.set(false);
    }
  }
}
