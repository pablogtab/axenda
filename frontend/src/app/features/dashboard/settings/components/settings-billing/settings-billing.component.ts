import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SubscriptionService } from '../../../../../core/services/subscription.service';
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
              <div class="flex items-center justify-between py-3">
                <span class="text-xs text-text-muted">Próximo pago</span>
                <span class="text-xs font-bold text-text-dim">---</span>
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
            <div class="space-y-2" *ngIf="subService.limits()!.maxWhatsapp > 0">
              <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span class="text-text-muted">Mensajes WhatsApp</span>
                <span class="text-text-main">{{ subService.usage()?.whatsappMonth }} / {{ subService.limits()!.maxWhatsapp >= 999999 ? '∞' : subService.limits()?.maxWhatsapp }}</span>
              </div>
              <div class="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
                <div class="h-full bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all duration-1000" 
                  [style.width.%]="subService.limits()!.maxWhatsapp >= 999999 ? 0 : (subService.usage()!.whatsappMonth / subService.limits()!.maxWhatsapp) * 100"></div>
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
            Cambiar de Plan
          </button>
        </div>
        <!-- Background glow -->
        <div class="absolute right-0 bottom-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2"></div>
      </div>

      <!-- Componente de Planes (Movido a su propia página) -->
      
    </div>
  `
})
export class SettingsBillingComponent {
  public subService = inject(SubscriptionService);
}
