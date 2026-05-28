import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
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
    <div class="h-full overflow-y-auto bg-bg-primary text-text-main p-4 md:p-8 custom-scrollbar animate-in fade-in duration-500">
      <!-- Header / Progress -->
      <div class="max-w-6xl mx-auto mb-12">
        <div class="flex items-center justify-between mb-8">
          <button routerLink="/dashboard/settings" [queryParams]="{section: 'billing'}" 
            class="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors group cursor-pointer">
            <app-icon name="arrow_back" class="group-hover:-translate-x-1 transition-transform"></app-icon>
            <span class="text-sm font-bold">Volver a Configuración</span>
          </button>
          
          <div class="hidden md:flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                [class.bg-primary]="currentStep() >= 1" [class.text-white]="currentStep() >= 1"
                [class.bg-surface-subtle]="currentStep() < 1" [class.text-text-muted]="currentStep() < 1">1</span>
              <span class="text-[10px] font-black uppercase tracking-[0.2em]" [class.text-primary]="currentStep() === 1" [class.text-text-muted]="currentStep() !== 1">Elegir Plan</span>
            </div>
            <div class="w-8 h-[2px] bg-border"></div>
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                [class.bg-primary]="currentStep() >= 2" [class.text-white]="currentStep() >= 2"
                [class.bg-surface-subtle]="currentStep() < 2" [class.text-text-muted]="currentStep() < 2">2</span>
              <span class="text-[10px] font-black uppercase tracking-[0.2em]" [class.text-primary]="currentStep() === 2" [class.text-text-muted]="currentStep() !== 2">Ciclo de Facturación</span>
            </div>
            <div class="w-8 h-[2px] bg-border"></div>
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                [class.bg-primary]="currentStep() >= 3" [class.text-white]="currentStep() >= 3"
                [class.bg-surface-subtle]="currentStep() < 3" [class.text-text-muted]="currentStep() < 3">3</span>
              <span class="text-[10px] font-black uppercase tracking-[0.2em]" [class.text-primary]="currentStep() === 3" [class.text-text-muted]="currentStep() !== 3">Confirmar y Pagar</span>
            </div>
          </div>
        </div>

        <div class="text-center md:text-left">
          <h1 class="text-4xl md:text-5xl font-black tracking-tighter text-text-main mb-4">
            {{ stepTitle() }}
          </h1>
          <p class="text-lg text-text-muted max-w-2xl">
            {{ stepDescription() }}
          </p>
        </div>

        <!-- Payments Disabled Banner -->
        <div *ngIf="!subService.paymentsEnabled()" class="mt-8 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex gap-4 items-start animate-in fade-in slide-in-from-top-4 duration-500">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0 border border-amber-500/20">
            <app-icon name="warning" class="text-amber-500 text-lg"></app-icon>
          </div>
          <div>
            <h4 class="text-sm font-black text-text-main mb-1">Pagos temporalmente no disponibles</h4>
            <p class="text-xs text-text-muted leading-relaxed">
              Actualmente estamos realizando tareas de mantenimiento en nuestra pasarela de pagos. Los cobros online se encuentran suspendidos temporalmente. Disculpa las molestias.
            </p>
          </div>
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
              class="glass p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
              [class.border-primary]="billingCycle() === 'MONTHLY'"
              [class.border-border/30]="billingCycle() !== 'MONTHLY'">
              <div class="relative z-10">
                <div class="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <app-icon name="calendar_view_month" class="text-2xl text-text-muted"></app-icon>
                </div>
                <h3 class="text-2xl font-black text-text-main mb-2">Mensual</h3>
                <p class="text-text-muted text-sm mb-6">Paga mes a mes. Ideal para probar la plataforma sin compromisos a largo plazo.</p>
                <div class="text-3xl font-black text-text-main">
                  $ {{ selectedPlan()?.priceMonthly }} <span class="text-sm font-normal text-text-muted">/mes</span>
                </div>
              </div>
              <div *ngIf="billingCycle() === 'MONTHLY'" class="absolute top-6 right-6">
                <app-icon name="check_circle" class="text-primary text-2xl"></app-icon>
              </div>
            </div>

            <!-- Yearly -->
            <div (click)="setCycle('YEARLY')" 
              class="glass p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
              [class.border-primary]="billingCycle() === 'YEARLY'"
              [class.border-border/30]="billingCycle() !== 'YEARLY'">
              
              <div class="absolute -right-12 top-8 rotate-45 bg-success text-white text-[10px] font-black py-1.5 px-12 shadow-lg tracking-wider">
                AHORRA 20%
              </div>

              <div class="relative z-10">
                <div class="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <app-icon name="calendar_today" class="text-2xl text-success"></app-icon>
                </div>
                <h3 class="text-2xl font-black text-text-main mb-2">Anual</h3>
                <p class="text-text-muted text-sm mb-6">Un único pago al año. La mejor opción para negocios establecidos.</p>
                <div class="text-3xl font-black text-text-main">
                  $ {{ selectedPlan()?.priceYearly }} <span class="text-sm font-normal text-text-muted">/año</span>
                </div>
                <p class="text-success text-xs font-bold mt-2">Equivale a $ {{ ((selectedPlan()?.priceYearly || 0) / 12) | number:'1.0-0' }}/mes</p>
              </div>
              <div *ngIf="billingCycle() === 'YEARLY'" class="absolute top-6 right-6">
                <app-icon name="check_circle" class="text-primary text-2xl"></app-icon>
              </div>
            </div>
          </div>

          <div class="flex justify-center mt-12 gap-4">
            <button (click)="currentStep.set(1)" class="btn-secondary px-8 py-4 cursor-pointer">
              Atrás
            </button>
            <button (click)="currentStep.set(3)" [disabled]="!billingCycle()"
              class="btn-primary px-12 py-4 cursor-pointer">
              Continuar
            </button>
          </div>
        </div>

        <!-- Step 3: Review & Pay -->
        <div *ngIf="currentStep() === 3" class="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="glass p-8 md:p-12 rounded-[2.5rem] border border-border relative overflow-hidden">
            <!-- Subtle background glow -->
            <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>

            <div class="relative z-10">
              <h3 class="text-xs font-black text-primary uppercase tracking-[0.3em] mb-8">Resumen de tu suscripción</h3>
              
              <div class="space-y-6 mb-12">
                <div class="flex justify-between items-end">
                  <div>
                    <span class="text-text-muted text-xs block mb-1">Plan Seleccionado</span>
                    <span class="text-2xl font-black text-text-main">{{ selectedPlan()?.name }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-text-muted text-xs block mb-1">Ciclo</span>
                    <span class="text-lg font-bold text-text-main">{{ billingCycle() === 'MONTHLY' ? 'Mensual' : 'Anual' }}</span>
                  </div>
                </div>

                <div class="p-4 rounded-2xl bg-surface-subtle border border-border space-y-4">
                  <div class="flex justify-between items-center text-xs pb-3 border-b border-border">
                    <span class="text-text-muted">Período de cobertura</span>
                    <span class="font-bold text-text-main">
                      {{ newPeriodStart() | date:'dd/MM/yyyy' }} al {{ newPeriodEnd() | date:'dd/MM/yyyy' }}
                    </span>
                  </div>
                  
                  <!-- Quantity Selector -->
                  <div class="flex justify-between items-center py-2 border-b border-border" *ngIf="billingCycle() === 'MONTHLY'">
                    <span class="text-xs text-text-muted">Cantidad de meses</span>
                    <div class="flex items-center gap-2 bg-surface-subtle border border-border rounded-xl p-1">
                      <button (click)="decreaseQuantity()" [disabled]="quantity() <= 1" 
                        class="w-7 h-7 rounded-lg bg-surface-subtle hover:bg-surface-subtle-hover flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer">
                        <app-icon name="remove" class="!text-[10px] text-text-muted"></app-icon>
                      </button>
                      <span class="w-8 text-center font-bold text-xs text-text-main">{{ quantity() }}</span>
                      <button (click)="increaseQuantity()" [disabled]="quantity() >= 12"
                        class="w-7 h-7 rounded-lg bg-surface-subtle hover:bg-surface-subtle-hover flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer">
                        <app-icon name="add" class="!text-[10px] text-text-muted"></app-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Coupon / Referral Field -->
                  <div class="pt-2 pb-2 border-b border-border">
                    <span class="text-xs text-text-muted block mb-2">¿Tenés un código de descuento o referido?</span>
                    <div class="flex gap-2">
                      <div class="relative flex-1">
                        <input 
                          type="text" 
                          [value]="referralCode()"
                          (input)="referralCode.set($any($event.target).value)"
                          placeholder="Ej: REFERIDO10"
                          [disabled]="appliedReferralCode() !== null"
                          class="w-full bg-surface-subtle border border-border/60 rounded-xl px-4 py-2 text-xs font-bold text-text-main focus:outline-none focus:border-primary/50 disabled:opacity-60 uppercase"
                        />
                        <div *ngIf="appliedReferralCode() !== null" class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                          <app-icon name="check_circle" class="text-success text-sm"></app-icon>
                        </div>
                      </div>
                      
                      <button 
                        *ngIf="appliedReferralCode() === null"
                        type="button" 
                        (click)="applyReferralCode()" 
                        [disabled]="isValidatingReferral() || !referralCode().trim()"
                        class="btn-primary py-2 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <span *ngIf="!isValidatingReferral()">Aplicar</span>
                        <div *ngIf="isValidatingReferral()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </button>

                      <button 
                        *ngIf="appliedReferralCode() !== null"
                        type="button" 
                        (click)="removeReferralCode()" 
                        class="w-8 h-8 rounded-xl bg-error/15 border border-error/20 flex items-center justify-center shrink-0 cursor-pointer hover:bg-error/20 transition-all"
                      >
                        <app-icon name="close" class="text-error text-xs"></app-icon>
                      </button>
                    </div>
                    <p *ngIf="referralError()" class="text-error text-[10px] font-medium mt-1 animate-in fade-in duration-200">
                      {{ referralError() }}
                    </p>
                    <p *ngIf="appliedReferralCode() !== null" class="text-success text-[10px] font-bold mt-1 animate-in fade-in duration-200">
                      ¡Código aplicado! {{ appliedDiscountPercent() }}% de descuento.
                    </p>
                  </div>

                  <div class="flex justify-between items-center text-[10px]" *ngIf="subService.status()?.status === 'ACTIVE' && subService.endDate()">
                    <span class="text-text-dim">Nota de renovación</span>
                    <span class="text-primary font-bold text-right">
                      Se acumula a tu plan actual
                    </span>
                  </div>
                  
                  <div class="space-y-2">
                    <div class="flex justify-between items-center text-xs text-text-muted">
                      <span>Costo base ({{ billingCycle() === 'MONTHLY' ? quantity() : 1 }} {{ billingCycle() === 'MONTHLY' ? 'mes' : 'año' }}{{ billingCycle() === 'MONTHLY' && quantity() > 1 ? 'es' : '' }})</span>
                      <span class="font-bold text-text-main">
                        $ {{ (billingCycle() === 'MONTHLY' ? selectedPlan()?.priceMonthly : selectedPlan()?.priceYearly) * (billingCycle() === 'MONTHLY' ? quantity() : 1) | number:'1.0-0' }}
                      </span>
                    </div>
                    
                    <div class="flex justify-between items-center text-xs text-success" *ngIf="upgradeCredit() > 0">
                      <span>Crédito a favor (Plan anterior)</span>
                      <span class="font-bold">- $ {{ upgradeCredit() | number:'1.0-0' }}</span>
                    </div>

                    <div class="flex justify-between items-center text-xs text-success" *ngIf="appliedDiscountPercent() > 0">
                      <span>Descuento Código ({{ appliedReferralCode() }})</span>
                      <span class="font-bold">- $ {{ discountAmount() | number:'1.0-0' }}</span>
                    </div>

                    <div class="flex justify-between items-center text-xs text-success" *ngIf="billingCycle() === 'YEARLY'">
                      <span>Descuento Anual (20%)</span>
                      <span class="font-bold">Incluido</span>
                    </div>

                    <div class="mt-4 pt-4 border-t border-border flex justify-between items-center">
                      <span class="text-lg font-bold text-text-main">Total a pagar hoy</span>
                      <span class="text-3xl font-black text-primary">$ {{ totalPrice() | number:'1.0-0' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <button (click)="processPayment()" [disabled]="isProcessing() || !subService.paymentsEnabled()"
                  class="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <span *ngIf="!isProcessing()">Ir a Pagar con Mercado Pago</span>
                  <div *ngIf="isProcessing()" class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <app-icon *ngIf="!isProcessing()" name="arrow_forward" class="text-white"></app-icon>
                </button>
                <button (click)="currentStep.set(2)" class="w-full py-4 text-text-muted hover:text-text-main font-bold transition-all cursor-pointer">
                  Cambiar ciclo de facturación
                </button>
              </div>

              <p class="mt-8 text-[10px] text-text-dim text-center leading-relaxed">
                Al hacer clic en "Ir a Pagar", serás redirigido a Mercado Pago para completar la transacción de forma segura. 
                Podrás cancelar tu suscripción en cualquier momento desde la configuración.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SubscriptionPlansComponent implements OnInit {
  currentStep = signal(1);
  selectedPlan = signal<Plan | null>(null);
  billingCycle = signal<'MONTHLY' | 'YEARLY'>('MONTHLY');
  isProcessing = signal(false);
  quantity = signal(1);
  plans = signal<any[]>([]);

  // Referidos y cupones
  referralCode = signal<string>('');
  appliedDiscountPercent = signal<number>(0);
  appliedReferralCode = signal<string | null>(null);
  referralError = signal<string>('');
  isValidatingReferral = signal<boolean>(false);

  public subService = inject(SubscriptionService);

  constructor() {
    effect(() => {
      const plan = this.selectedPlan();
      const step = this.currentStep();
      const savedCode = localStorage.getItem('referral_code');
      if (plan && step === 3 && savedCode && !this.appliedReferralCode() && !this.isValidatingReferral()) {
        this.referralCode.set(savedCode);
        this.applyReferralCode();
      }
    }, { allowSignalWrites: true });
  }

  currentPlanDetails = computed(() => {
    const status = this.subService.status();
    if (!status || status.plan.code === 'STARTER') return null;
    return this.plans().find(p => p.code === status.plan.code) || null;
  });

  upgradeCredit = computed(() => {
    const status = this.subService.status();
    const currentPlan = this.currentPlanDetails();
    const targetPlan = this.selectedPlan();
    
    if (!status || !currentPlan || !targetPlan || status.plan.code === targetPlan.code) {
      return 0;
    }
    
    if (status.status !== 'ACTIVE' || !status.endDate) {
      return 0;
    }
    
    const now = new Date();
    const endD = new Date(status.endDate);
    if (endD <= now) {
      return 0;
    }
    
    const remainingTime = endD.getTime() - now.getTime();
    const remainingDays = Math.max(0, remainingTime / (1000 * 60 * 60 * 24));
    
    const currentPrice = status.billingCycle === 'MONTHLY' ? currentPlan.priceMonthly : currentPlan.priceYearly;
    const periodDays = status.billingCycle === 'MONTHLY' ? 30 : 365;
    const dailyPrice = Number(currentPrice) / periodDays;
    
    return Math.round(remainingDays * dailyPrice);
  });

  newPeriodStart = computed(() => {
    const status = this.subService.status();
    const targetPlan = this.selectedPlan();
    const now = new Date();
    
    const isPlanChange = status && targetPlan && status.plan.code !== targetPlan.code;
    
    if (!isPlanChange && status && status.status === 'ACTIVE' && status.endDate) {
      const endD = new Date(status.endDate);
      if (endD > now) {
        return endD;
      }
    }
    return now;
  });

  newPeriodEnd = computed(() => {
    const start = this.newPeriodStart();
    const end = new Date(start);
    const qty = this.billingCycle() === 'YEARLY' ? 1 : this.quantity();
    if (this.billingCycle() === 'MONTHLY') {
      end.setMonth(end.getMonth() + qty);
    } else {
      end.setFullYear(end.getFullYear() + qty);
    }
    return end;
  });

  discountAmount = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return 0;
    const price = this.billingCycle() === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;
    const qty = this.billingCycle() === 'YEARLY' ? 1 : this.quantity();
    const base = price * qty;
    const credit = this.upgradeCredit();
    const baseCharged = Math.max(10, base - credit);
    
    const pct = this.appliedDiscountPercent();
    if (pct <= 0) return 0;
    
    return Math.round(baseCharged * (pct / 100));
  });

  totalPrice = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return 0;
    const price = this.billingCycle() === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;
    const qty = this.billingCycle() === 'YEARLY' ? 1 : this.quantity();
    const base = price * qty;
    const credit = this.upgradeCredit();
    const baseCharged = Math.max(10, base - credit);
    
    const discount = this.discountAmount();
    return Math.max(10, baseCharged - discount);
  });

  increaseQuantity() {
    this.quantity.update(q => q < 12 ? q + 1 : q);
  }

  decreaseQuantity() {
    this.quantity.update(q => q > 1 ? q - 1 : q);
  }

  async applyReferralCode() {
    const code = this.referralCode().trim();
    if (!code) return;
    
    this.isValidatingReferral.set(true);
    this.referralError.set('');
    try {
      const plan = this.selectedPlan();
      const res = await this.subService.validateReferralCode(code, plan?.code);
      if (res.valid) {
        this.appliedDiscountPercent.set(res.discountPercent);
        this.appliedReferralCode.set(res.code);
        this.referralError.set('');
      } else {
        this.referralError.set('El código ingresado no es válido.');
        this.appliedDiscountPercent.set(0);
        this.appliedReferralCode.set(null);
      }
    } catch (err: any) {
      const msg = err.error?.error?.message || err.error?.message || 'Error al validar el código.';
      this.referralError.set(msg);
      this.appliedDiscountPercent.set(0);
      this.appliedReferralCode.set(null);
    } finally {
      this.isValidatingReferral.set(false);
    }
  }

  removeReferralCode() {
    this.referralCode.set('');
    this.appliedDiscountPercent.set(0);
    this.appliedReferralCode.set(null);
    this.referralError.set('');
    localStorage.removeItem('referral_code');
  }

  async ngOnInit() {
    try {
      await Promise.all([
        this.subService.loadConfig(),
        this.subService.getPlans().then(data => this.plans.set(data || []))
      ]);
    } catch (err) {
      console.error('Error al cargar datos iniciales de planes:', err);
    }
  }

  stepTitle() {
    switch (this.currentStep()) {
      case 1: return 'Elegí el plan ideal';
      case 2: return '¿Cómo preferís pagar?';
      case 3: return 'Revisá tu pedido';
      default: return '';
    }
  }

  stepDescription() {
    switch (this.currentStep()) {
      case 1: return 'Seleccioná el plan que mejor se adapte al tamaño de tu negocio y equipo.';
      case 2: return 'Ahorrá hasta un 20% eligiendo el pago anual, o mantené la flexibilidad del pago mensual.';
      case 3: return 'Estás a un paso de potenciar tu negocio con Axenda. Verificá que todo esté correcto.';
      default: return '';
    }
  }

  onPlanSelected(plan: any) {
    this.selectedPlan.set(plan);
    this.quantity.set(1);
    this.currentStep.set(2);
  }

  setCycle(cycle: 'MONTHLY' | 'YEARLY') {
    this.billingCycle.set(cycle);
    this.quantity.set(1);
  }

  async processPayment() {
    const plan = this.selectedPlan();
    if (!plan) return;

    this.isProcessing.set(true);
    try {
      const qty = this.billingCycle() === 'YEARLY' ? 1 : this.quantity();
      const codeToPass = this.appliedReferralCode() || undefined;
      const res = await this.subService.checkout(plan.id, this.billingCycle(), qty, codeToPass);
      if (res.initPoint) {
        localStorage.removeItem('referral_code');
        window.location.href = res.initPoint;
      }
    } catch (error) {
      console.error('Error in checkout:', error);
      this.isProcessing.set(false);
    }
  }
}
