import { Component, Input, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SubscriptionService } from '../../../../../core/services/subscription.service';
import { SnackbarService } from '../../../../../core/services/snackbar.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PlansGridComponent } from '../../../subscription/plans-grid.component';

@Component({
  selector: 'app-settings-billing',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold text-text-main flex items-center gap-2">
          <app-icon name="credit_card" class="text-primary text-base"></app-icon> Cuenta y Plan
        </h2>
      </div>

      <!-- Plan Status Card -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="glass p-6 rounded-[2rem] border border-border relative overflow-hidden group">
          <!-- Background decoration -->
          <div class="absolute -top-12 -right-12 w-40 h-40 bg-primary/20 blur-[80px] rounded-full group-hover:bg-primary/30 transition-all duration-700"></div>
          
          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 rounded-2xl bg-primary-glow flex items-center justify-center border border-primary/20 shadow-inner">
                <app-icon name="verified_user" class="text-primary text-2xl"></app-icon>
              </div>
              <div>
                <span class="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Tu plan actual</span>
                <h3 class="text-2xl font-black text-text-main tracking-tight">{{ subService.plan()?.name || 'Cargando...' }}</h3>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between py-3 border-b border-border">
                <span class="text-xs text-text-muted">Estado</span>
                <span class="text-xs font-bold px-3 py-1 rounded-full" 
                  [ngClass]="{'bg-green-500/10 text-green-500': subService.isActive(), 'bg-primary-glow text-primary': subService.isTrial()}">
                  {{ subService.status()?.status === 'TRIALING' ? 'Periodo de Prueba' : 'Activa' }}
                </span>
              </div>
              <div class="flex items-center justify-between py-3 border-b border-border" *ngIf="subService.isTrial()">
                <span class="text-xs text-text-muted">Días restantes</span>
                <span class="text-xs font-black text-text-main">{{ subService.trialDaysRemaining() }} días</span>
              </div>
              <div class="flex items-center justify-between py-3 border-b border-border" *ngIf="subService.isTrial()">
                <span class="text-xs text-text-muted">Vence el</span>
                <span class="text-xs font-bold text-text-dim">{{ subService.status()?.trialEndsAt | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="flex items-center justify-between py-3" *ngIf="!subService.isTrial() && subService.plan()?.code !== 'STARTER'">
                <span class="text-xs text-text-muted">Próximo vencimiento</span>
                <span class="text-xs font-bold text-text-dim">{{ subService.endDate() ? (subService.endDate() | date:'dd/MM/yyyy') : 'Sin límite' }}</span>
              </div>
              <div class="flex items-center justify-between py-3" *ngIf="!subService.isTrial() && subService.plan()?.code === 'STARTER'">
                <span class="text-xs text-text-muted">Próximo vencimiento</span>
                <span class="text-xs font-bold text-text-dim">Sin vencimiento</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Usage Card -->
        <div class="glass p-6 rounded-[2rem] border border-border relative overflow-hidden">
          <h4 class="text-xs font-black text-text-dim uppercase tracking-widest mb-6">Límites y Uso</h4>
          <div class="space-y-6" *ngIf="subService.usage() && subService.limits()">
            <!-- Professionals Usage -->
            <div class="space-y-2">
              <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span class="text-text-muted">Profesionales</span>
                <span class="text-text-main">{{ subService.usage()?.professionals }} / {{ subService.limits()!.maxProfessionals >= 999999 ? '∞' : subService.limits()?.maxProfessionals }}</span>
              </div>
              <div class="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] transition-all duration-1000" 
                  [style.width.%]="subService.limits()!.maxProfessionals >= 999999 ? 0 : (subService.usage()!.professionals / subService.limits()!.maxProfessionals) * 100"></div>
              </div>
            </div>
            <!-- Appointments Usage -->
            <div class="space-y-2">
              <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span class="text-text-muted">Turnos Mensuales</span>
                <span class="text-text-main">{{ subService.usage()?.appointmentsMonth }} / {{ subService.limits()!.maxAppointments >= 999999 ? '∞' : subService.limits()?.maxAppointments }}</span>
              </div>
              <div class="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
                <div class="h-full bg-accent rounded-full shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)] transition-all duration-1000" 
                  [style.width.%]="subService.limits()!.maxAppointments >= 999999 ? 0 : (subService.usage()!.appointmentsMonth / subService.limits()!.maxAppointments) * 100"></div>
              </div>
            </div>
            <!-- WhatsApp Usage (Si aplica) -->
            <div class="space-y-4" *ngIf="subService.limits()!.maxWhatsapp > 0">
              <!-- Bar 1: Plan Messages -->
              <div class="space-y-2">
                <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span class="text-text-muted flex items-center gap-1">
                    <app-icon name="chat" class="text-[#25D366] text-xs"></app-icon> Mensajes de Plan
                  </span>
                  <span class="text-text-main font-black">
                    {{ subService.usage()?.whatsappMonth || 0 }} / {{ subService.limits()!.maxWhatsapp >= 999999 ? '∞' : subService.limits()?.maxWhatsapp }}
                  </span>
                </div>
                <div class="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden relative">
                  <div class="h-full bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-full shadow-[0_0_10px_rgba(37,211,102,0.4)] transition-all duration-1000" 
                    [style.width.%]="subService.limits()!.maxWhatsapp >= 999999 ? 0 : (((subService.usage()?.whatsappMonth || 0) / subService.limits()!.maxWhatsapp) * 100 > 100 ? 100 : ((subService.usage()?.whatsappMonth || 0) / subService.limits()!.maxWhatsapp) * 100)"></div>
                </div>
              </div>

              <!-- Bar 2: Extra Messages (Only if has purchased extras) -->
              <div class="space-y-2 pt-2 border-t border-border/10 animate-in fade-in duration-300" *ngIf="subService.usage()?.extraWhatsappTotal">
                <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span class="text-text-muted flex items-center gap-1">
                    <app-icon name="add_circle" class="text-[#25D366] text-xs"></app-icon> Mensajes Extras
                  </span>
                  <span class="text-text-main font-black">
                    {{ (subService.usage()?.extraWhatsappTotal || 0) - (subService.usage()?.extraWhatsappBalance || 0) }} / {{ subService.usage()?.extraWhatsappTotal }}
                  </span>
                </div>
                <div class="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden relative">
                  <div class="h-full bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-full shadow-[0_0_10px_rgba(37,211,102,0.4)] transition-all duration-1000" 
                    [style.width.%]="subService.usage()?.extraWhatsappTotal ? (((subService.usage()?.extraWhatsappTotal || 0) - (subService.usage()?.extraWhatsappBalance || 0)) / subService.usage()?.extraWhatsappTotal) * 100 : 0"></div>
                </div>
              </div>

              <!-- Explanation & Button -->
              <div class="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                <div class="text-[9px] text-text-dim max-w-[170px] leading-tight">
                  <span class="block">Una vez agotado tu plan, se consumen los mensajes extras automáticamente por vencimiento. Los packs expiran a los 3 meses.</span>
                </div>
                <button routerLink="/dashboard/subscription/buy-packs" class="px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0">
                  <app-icon name="add" class="text-xs"></app-icon> Comprar Extras
                </button>
              </div>

              <!-- Active Packs List -->
              <div class="mt-4 pt-3 border-t border-border/20 space-y-2 animate-in fade-in duration-300" *ngIf="subService.status()?.activePacks?.length">
                <h5 class="text-[9px] font-black text-text-dim uppercase tracking-wider mb-2">Detalle de Packs</h5>
                <div class="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  <div *ngFor="let pack of subService.status()?.activePacks" class="flex justify-between items-center text-[10px] bg-surface-subtle/30 p-2 rounded-lg border border-border/30">
                    <div class="flex items-center gap-1.5">
                      <app-icon name="inventory_2" class="text-[#25D366] text-[11px]"></app-icon>
                      <span class="font-semibold text-text-muted">Pack {{ pack.quantity }} msgs</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="font-bold text-text-main">{{ pack.remaining }} / {{ pack.quantity }} rest.</span>
                      <span class="text-[9px] text-text-dim font-medium bg-surface-subtle px-1.5 py-0.5 rounded border border-border/30">Expira: {{ pack.expiresAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Branches Usage -->
            <div class="space-y-2">
              <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span class="text-text-muted">Sucursales</span>
                <span class="text-text-main">{{ subService.usage()?.branches }} / {{ subService.limits()!.maxBranches >= 999999 ? '∞' : subService.limits()?.maxBranches }}</span>
              </div>
              <div class="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
                <div class="h-full bg-white/20 rounded-full transition-all duration-1000" 
                  [style.width.%]="subService.limits()!.maxBranches >= 999999 ? 0 : (subService.usage()!.branches / subService.limits()!.maxBranches) * 100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment History Card -->
      <div class="glass p-6 rounded-[2rem] border border-border relative overflow-hidden">
        <h3 class="text-lg font-black text-text-main flex items-center gap-2 mb-6 tracking-tight">
          <app-icon name="receipt_long" class="text-primary text-base"></app-icon> Historial de Pagos
        </h3>

        <!-- Loading state -->
        <div *ngIf="isLoadingInvoices()" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!isLoadingInvoices() && invoices().length === 0" class="text-center py-12 text-text-muted space-y-3">
          <div class="w-16 h-16 rounded-3xl bg-surface-subtle flex items-center justify-center mx-auto border border-border/50">
            <app-icon name="history" class="text-3xl text-text-dim opacity-70"></app-icon>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-bold text-text-main">No hay pagos registrados</p>
            <p class="text-xs text-text-dim max-w-xs mx-auto">Cuando realices un pago por tu suscripción mensual o anual, verás el detalle y comprobante aquí.</p>
          </div>
        </div>

        <!-- Invoices List -->
        <div *ngIf="!isLoadingInvoices() && invoices().length > 0" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="py-4 pr-4 text-[10px] font-black text-text-dim uppercase tracking-wider">Fecha</th>
                <th class="py-4 pr-4 text-[10px] font-black text-text-dim uppercase tracking-wider">Periodo</th>
                <th class="py-4 pr-4 text-[10px] font-black text-text-dim uppercase tracking-wider">Detalle</th>
                <th class="py-4 pr-4 text-[10px] font-black text-text-dim uppercase tracking-wider">Monto</th>
                <th class="py-4 pr-4 text-[10px] font-black text-text-dim uppercase tracking-wider">Estado</th>
                <th class="py-4 text-[10px] font-black text-text-dim uppercase tracking-wider text-right">Comprobante</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let invoice of invoices()" class="border-b border-border/30 hover:bg-white/[0.01] transition-colors">
                <td class="py-4 pr-4 text-xs font-semibold text-text-main whitespace-nowrap">
                  {{ invoice.paymentDate | date:'dd/MM/yyyy' }}
                </td>
                <td class="py-4 pr-4 text-xs text-text-muted whitespace-nowrap">
                  {{ invoice.billingPeriodStart | date:'dd/MM/yyyy' }} - {{ invoice.billingPeriodEnd | date:'dd/MM/yyyy' }}
                </td>
                <td class="py-4 pr-4 text-xs max-w-[220px] break-words">
                  <span class="font-semibold text-text-main block">{{ invoice.description || 'Suscripción Axenda' }}</span>
                  <span class="text-[10px] text-text-muted block">
                    {{ invoice.externalPaymentId ? 'Mercado Pago (Ref: ' + invoice.externalPaymentId + ')' : 'Pago manual' }}
                  </span>
                </td>
                <td class="py-4 pr-4 text-xs font-black text-text-main whitespace-nowrap">
                  {{ invoice.amount | currency:'ARS':'$':'1.0-2' }}
                </td>
                <td class="py-4 pr-4 text-xs whitespace-nowrap">
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold inline-block" 
                    [ngClass]="{
                      'bg-green-500/10 text-green-500': invoice.status === 'PAID',
                      'bg-yellow-500/10 text-yellow-500': invoice.status === 'PENDING',
                      'bg-red-500/10 text-red-500': invoice.status === 'FAILED',
                      'bg-blue-500/10 text-blue-500': invoice.status === 'REFUNDED'
                    }">
                    {{ 
                      invoice.status === 'PAID' ? 'Aprobado' :
                      invoice.status === 'PENDING' ? 'Pendiente' :
                      invoice.status === 'FAILED' ? 'Rechazado' :
                      invoice.status === 'REFUNDED' ? 'Devuelto' : invoice.status 
                    }}
                  </span>
                </td>
                <td class="py-4 text-xs text-right whitespace-nowrap">
                  <a *ngIf="invoice.invoiceUrl" [href]="invoice.invoiceUrl" target="_blank" class="inline-flex items-center gap-1 text-primary hover:underline font-bold">
                    <app-icon name="download" class="text-sm"></app-icon> Ver
                  </a>
                  <span *ngIf="!invoice.invoiceUrl" class="text-text-dim text-[10px]">No disponible</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Plans Comparison / Actions -->
      <div class="bg-primary-glow border border-primary/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div class="relative z-10 text-center md:text-left">
          <h4 class="text-xl font-black text-text-main tracking-tight mb-2">¿Necesitas más?</h4>
          <p class="text-sm text-text-muted max-w-sm">
            Mejora tu plan para obtener turnos ilimitados, más sucursales y soporte prioritario.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 relative z-10 w-full md:w-auto">
          <button routerLink="/dashboard/subscription/plans" class="px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl text-sm font-bold shadow-xl shadow-primary/20 transition-all cursor-pointer text-center">
            {{ subService.plan()?.code === 'STARTER' || subService.isTrial() ? 'Contratar Plan' : 'Extender o Cambiar Plan' }}
          </button>
        </div>
        <!-- Background glow -->
        <div class="absolute right-0 bottom-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2"></div>
      </div>

    </div>
  `
})
export class SettingsBillingComponent implements OnInit {
  public subService = inject(SubscriptionService);
  private snackbar = inject(SnackbarService);
  
  public invoices = signal<any[]>([]);
  public isLoadingInvoices = signal<boolean>(true);

  async ngOnInit() {
    try {
      await Promise.all([
        this.subService.loadStatus(),
        this.subService.getInvoices().then(data => this.invoices.set(data || []))
      ]);
    } catch (err) {
      console.error('Error al cargar datos de facturación:', err);
    } finally {
      this.isLoadingInvoices.set(false);
    }
  }
}
