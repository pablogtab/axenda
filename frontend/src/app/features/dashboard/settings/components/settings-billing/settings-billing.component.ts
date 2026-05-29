import { Component, Input, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SubscriptionService } from '../../../../../core/services/subscription.service';
import { SnackbarService } from '../../../../../core/services/snackbar.service';
import { IconComponent } from '@shared/components/icon/icon.component';

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
                    {{ subService.usage()?.whatsappMonth || 0 }} / {{ subService.limits()!.maxWhatsapp >= 999999 ? '∞' : subService.limits()!.maxWhatsapp }}
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

      <!-- Teaser / Upgrade Card for STARTER plan users or TRIAL users -->
      <div *ngIf="subService.plan()?.code === 'STARTER' || subService.status()?.status !== 'ACTIVE'" class="glass p-6 md:p-8 rounded-[2.5rem] border border-border/50 relative overflow-hidden group">
        <!-- Gorgeous background glows -->
        <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/15 transition-all duration-700"></div>
        <div class="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 blur-[100px] rounded-full group-hover:bg-accent/15 transition-all duration-700"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="space-y-4 max-w-xl text-left">
            <span class="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-1.5">
              <app-icon name="lock" class="text-primary text-sm"></app-icon> Programa de Invitados Bloqueado
            </span>
            <h3 class="text-2xl md:text-3xl font-black text-text-main tracking-tight">¡Ganá días premium recomendando Axenda!</h3>
            
            <p *ngIf="subService.plan()?.code === 'STARTER'" class="text-sm text-text-muted leading-relaxed">
              El programa de referidos está reservado para nuestros miembros con planes activos. Mejorá tu suscripción a un plan de pago para desbloquear tu propio código de descuento, compartirlo y ganar <strong class="text-primary">hasta 15 días gratis</strong> de suscripción premium por cada persona que invites.
            </p>
            <p *ngIf="subService.plan()?.code !== 'STARTER' && subService.status()?.status === 'TRIALING'" class="text-sm text-text-muted leading-relaxed">
              El programa de referidos se habilitará al iniciar tu suscripción de pago. ¡Comenzá tu suscripción hoy en **Pro o Business** para desbloquear tu código de referidos y empezar a acumular <strong class="text-primary">hasta 15 días gratis</strong>!
            </p>
          </div>
          
          <button routerLink="/dashboard/subscription/plans" class="px-6 py-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-primary/20 shrink-0 w-full md:w-auto text-center cursor-pointer">
            {{ subService.plan()?.code === 'STARTER' ? 'Mejorar Plan y Desbloquear' : 'Iniciar Suscripción y Desbloquear' }}
          </button>
        </div>
      </div>

      <!-- Referral / Invite Section -->
      <div *ngIf="subService.plan()?.code !== 'STARTER' && subService.status()?.status === 'ACTIVE'" class="glass p-6 md:p-8 rounded-[2.5rem] border border-border/50 relative overflow-hidden group animate-in fade-in duration-500">
        <!-- Subtle back glow -->
        <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-success/10 blur-[100px] rounded-full group-hover:bg-success/15 transition-all duration-700"></div>
        <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/15 transition-all duration-700"></div>

        <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <!-- Text info -->
          <div class="space-y-4 max-w-xl">
            <span class="text-[10px] font-black text-success uppercase tracking-[0.3em] flex items-center gap-1.5">
              <app-icon name="celebration" class="text-success text-sm"></app-icon> Programa de Invitados
            </span>
            <h3 class="text-2xl md:text-3xl font-black text-text-main tracking-tight">Compartí Axenda y ganá beneficios</h3>
            <p class="text-sm text-text-muted leading-relaxed">
              Invitá a tus amigos y colegas a digitalizar su agenda. Ellos obtienen un <strong class="text-success">10% de descuento</strong> en su primer pago de suscripción y vos recibís <strong class="text-primary">{{ getRewardDays() }} días gratis</strong> en tu plan actual por cada referido exitoso.
            </p>
            
            <!-- Statistics row -->
            <div class="grid grid-cols-2 gap-4 pt-2" *ngIf="referralCodeInfo()">
              <div class="bg-surface-subtle/40 border border-border/40 p-4 rounded-2xl flex flex-col justify-center">
                <span class="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Invitaciones Exitosas</span>
                <span class="text-2xl font-black text-text-main">{{ referralCodeInfo()?.totalReferrals }}</span>
              </div>
              <div class="bg-surface-subtle/40 border border-border/40 p-4 rounded-2xl flex flex-col justify-center">
                <span class="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Tiempo Gratis Acumulado</span>
                <span class="text-2xl font-black text-success">{{ referralCodeInfo()?.benefitsEarned }}</span>
              </div>
            </div>
          </div>

          <!-- Code Box -->
          <div class="shrink-0 flex flex-col items-center justify-center p-6 bg-surface-subtle/30 border border-border/40 rounded-3xl w-full lg:w-80">
            <span class="text-[10px] font-black text-text-dim uppercase tracking-widest mb-3">Tu Código Único</span>
            
            <div *ngIf="isLoadingReferral()" class="h-10 flex items-center justify-center">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>

            <div *ngIf="!isLoadingReferral() && referralCodeInfo()" class="w-full space-y-4">
              
              <!-- Modo Lectura -->
              <div *ngIf="!isEditingCode()" class="space-y-4 w-full animate-in fade-in duration-300">
                <div class="w-full bg-bg-primary/60 border border-border/50 rounded-2xl py-3 px-4 flex items-center justify-between">
                  <span class="text-sm font-black tracking-widest text-text-main uppercase">{{ referralCodeInfo()?.code }}</span>
                  <div class="flex items-center gap-1">
                    <button (click)="copyCode()" title="Copiar código" class="w-8 h-8 rounded-lg bg-surface-subtle hover:bg-surface-subtle-hover flex items-center justify-center transition-all cursor-pointer">
                      <app-icon name="content_copy" class="text-text-muted text-xs"></app-icon>
                    </button>
                    <button (click)="startEditingCode()" title="Personalizar código" class="w-8 h-8 rounded-lg bg-surface-subtle hover:bg-surface-subtle-hover flex items-center justify-center transition-all cursor-pointer">
                      <app-icon name="edit" class="text-text-muted text-xs"></app-icon>
                    </button>
                  </div>
                </div>

                <div class="flex gap-2 w-full">
                  <button (click)="shareOnWhatsApp()" class="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#25D366]/20">
                    <app-icon name="share" class="text-white text-xs"></app-icon> Compartir por WhatsApp
                  </button>
                </div>
              </div>

              <!-- Modo Edición -->
              <div *ngIf="isEditingCode()" class="space-y-3 w-full animate-in zoom-in-95 duration-200">
                <div class="w-full bg-bg-primary/60 border border-border/50 rounded-2xl p-2 flex items-center gap-2">
                  <input 
                    type="text" 
                    [value]="customCodeInput()"
                    (input)="onCodeInputChange($event)"
                    placeholder="ELEGÍ-TU-CÓDIGO"
                    class="flex-1 bg-transparent border-0 px-2 py-1 text-sm font-bold text-text-main focus:outline-none uppercase tracking-wider"
                    [disabled]="isSavingCustomCode()"
                  />
                  
                  <div class="flex gap-1 shrink-0">
                    <button (click)="suggestCode()" [disabled]="isSavingCustomCode()" title="Sugerir código" class="w-8 h-8 rounded-lg bg-surface-subtle hover:bg-surface-subtle-hover flex items-center justify-center transition-all cursor-pointer">
                      <app-icon name="auto_awesome" class="text-text-muted text-xs"></app-icon>
                    </button>
                    <button (click)="saveCustomCode()" [disabled]="isSavingCustomCode() || !customCodeInput().trim() || !!customCodeError()" class="w-8 h-8 rounded-lg bg-primary hover:bg-primary-hover flex items-center justify-center transition-all cursor-pointer disabled:opacity-50">
                      <div *ngIf="isSavingCustomCode()" class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <app-icon *ngIf="!isSavingCustomCode()" name="check" class="text-white text-xs"></app-icon>
                    </button>
                    <button (click)="cancelEditingCode()" [disabled]="isSavingCustomCode()" class="w-8 h-8 rounded-lg bg-surface-subtle hover:bg-surface-subtle-hover flex items-center justify-center transition-all cursor-pointer">
                      <app-icon name="close" class="text-text-muted text-xs"></app-icon>
                    </button>
                  </div>
                </div>
                <p *ngIf="customCodeError()" class="text-error text-[9px] font-medium leading-tight text-center">
                  {{ customCodeError() }}
                </p>
                <p class="text-[9px] text-text-dim text-center leading-normal">
                  Entre 5 y 15 caracteres. Solo letras, números y guiones. Sin palabras reservadas.
                </p>
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

  // Programa de Referidos
  public referralCodeInfo = signal<{ code: string; discountPercent: number; totalReferrals: number; benefitsEarned: string } | null>(null);
  public isLoadingReferral = signal<boolean>(true);

  // Personalización de código
  public isEditingCode = signal<boolean>(false);
  public customCodeInput = signal<string>('');
  public customCodeError = signal<string>('');
  public isSavingCustomCode = signal<boolean>(false);

  async ngOnInit() {
    try {
      // Cargamos el estado de la suscripción primero para conocer el plan actual
      await this.subService.loadStatus();
      
      await Promise.all([
        this.subService.getInvoices().then(data => this.invoices.set(data || [])),
        this.loadReferralCode()
      ]);
    } catch (err) {
      console.error('Error al cargar datos de facturación:', err);
    } finally {
      this.isLoadingInvoices.set(false);
    }
  }

  async loadReferralCode() {
    if (this.subService.plan()?.code === 'STARTER' || this.subService.status()?.status !== 'ACTIVE') {
      this.isLoadingReferral.set(false);
      return;
    }
    
    this.isLoadingReferral.set(true);
    try {
      const data = await this.subService.getMyReferralCode();
      this.referralCodeInfo.set(data);
    } catch (err) {
      console.error('Error al cargar el código de referido:', err);
    } finally {
      this.isLoadingReferral.set(false);
    }
  }

  copyCode() {
    const code = this.referralCodeInfo()?.code;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.snackbar.success('Código de referido copiado al portapapeles');
    });
  }

  shareOnWhatsApp() {
    const code = this.referralCodeInfo()?.code;
    if (!code) return;
    const text = `¡Hola! Te recomiendo Axenda para gestionar tus turnos y clientes. Registrate usando mi código ${code} y obtené un 10% de descuento en tu primer pago: ${window.location.origin}/register?ref=${code}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  startEditingCode() {
    this.customCodeError.set('');
    const code = this.referralCodeInfo()?.code || '';
    this.customCodeInput.set(code);
    this.isEditingCode.set(true);
    this.validateCodeRealtime(code);
  }

  cancelEditingCode() {
    this.isEditingCode.set(false);
    this.customCodeError.set('');
  }

  onCodeInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    // Convertir a mayúsculas y filtrar caracteres no permitidos (letras, números y guiones)
    let value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    input.value = value; // Sincronizar el campo de texto visualmente
    this.customCodeInput.set(value);
    this.validateCodeRealtime(value);
  }

  private readonly reservedWords = [
    'AXENDA', 'ADMIN', 'SYSTEM', 'DESCUENTO', 'DISCOUNT', 'PROMO', 'OFFER',
    'GRATIS', 'FREE', 'TEST', 'CUPON', 'COUPON', 'SUPERADMIN', 'SUPPORT', 'SOPORTE',
    'REGLAS', 'PLAN'
  ];

  validateCodeRealtime(code: string) {
    if (!code) {
      this.customCodeError.set('El código no puede estar vacío.');
      return;
    }

    if (code.length < 5) {
      this.customCodeError.set('El código debe tener al menos 5 caracteres.');
      return;
    }

    if (code.length > 15) {
      this.customCodeError.set('El código no puede superar los 15 caracteres.');
      return;
    }

    const regex = /^[A-Z0-9-]{5,15}$/;
    if (!regex.test(code)) {
      this.customCodeError.set('Solo se permiten letras mayúsculas, números y guiones.');
      return;
    }

    this.customCodeError.set('');
  }

  suggestCode() {
    const rawName = (this.referralCodeInfo()?.code || 'REFERIDO').split('-')[0].toUpperCase();
    const cleanName = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^A-Z0-9]/g, '');      // Solo letras y números

    const prefix = cleanName.length >= 3 ? cleanName.substring(0, 10) : 'REFERIDO';
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const suggested = `${prefix}-${randomSuffix}`;

    this.customCodeInput.set(suggested);
    this.validateCodeRealtime(suggested);
  }

  async saveCustomCode() {
    const code = this.customCodeInput().trim().toUpperCase();
    if (!code) return;

    this.validateCodeRealtime(code);
    if (this.customCodeError()) return;

    this.isSavingCustomCode.set(true);
    this.customCodeError.set('');
    try {
      const data = await this.subService.updateMyReferralCode(code);
      this.referralCodeInfo.set(data);
      this.isEditingCode.set(false);
      this.snackbar.success('Código de referido personalizado exitosamente.');
    } catch (err: any) {
      const msg = err.error?.error?.message || err.error?.message || 'Error al actualizar el código.';
      this.customCodeError.set(msg);
    } finally {
      this.isSavingCustomCode.set(false);
    }
  }

  getRewardDays(): number {
    const planCode = this.subService.plan()?.code || 'PRO';
    if (planCode === 'PRO') return 15;
    if (planCode === 'BUSINESS') return 10;
    return 5;
  }
}
