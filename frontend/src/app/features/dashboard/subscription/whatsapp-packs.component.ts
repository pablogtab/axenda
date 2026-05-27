import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-whatsapp-packs',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="h-full overflow-y-auto bg-bg-primary text-text-main p-4 md:p-8 custom-scrollbar animate-in fade-in duration-500">
      <!-- Header -->
      <div class="max-w-6xl mx-auto mb-12">
        <div class="flex items-center justify-between mb-8">
          <button routerLink="/dashboard/settings" [queryParams]="{section: 'billing'}" 
            class="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors group cursor-pointer">
            <app-icon name="arrow_back" class="group-hover:-translate-x-1 transition-transform"></app-icon>
            <span class="text-sm font-bold">Volver a Configuración</span>
          </button>
        </div>

        <div class="text-center md:text-left space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-primary-glow border border-primary/20 flex items-center justify-center shadow-inner">
            <app-icon name="chat" class="text-primary text-2xl"></app-icon>
          </div>
          <h1 class="text-4xl md:text-5xl font-black tracking-tighter text-gradient mb-2">
            Comprar Mensajes de WhatsApp
          </h1>
          <p class="text-lg text-text-muted max-w-2xl">
            Carga paquetes de mensajes extras para usar <strong>una vez agotado tu plan</strong> mensual. Los mensajes comprados tienen una validez de <strong>3 meses</strong> y se consumen automáticamente según su fecha de vencimiento.
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
      <div class="max-w-6xl mx-auto space-y-12">
        <!-- Packs Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Pack Card -->
          <div *ngFor="let pack of wppPacks" 
            class="glass rounded-[2.5rem] p-8 flex flex-col justify-between items-center text-center relative overflow-hidden transition-all duration-300 group hover:border-primary/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
            
            <div class="absolute -top-24 -left-24 w-48 h-48 bg-primary/5 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div class="space-y-6 relative z-10 w-full">
              <div class="text-xs font-bold text-text-muted uppercase tracking-widest">{{ pack.name }}</div>
              
              <div class="space-y-1">
                <div class="text-5xl font-black text-text-main tracking-tight">{{ pack.quantity }}</div>
                <div class="text-[10px] text-text-dim uppercase tracking-wider">Mensajes</div>
              </div>
              
              <div class="space-y-2">
                <div class="text-3xl font-black text-text-main">{{ pack.price | currency:'ARS':'$':'1.0-0' }}</div>
                <div *ngIf="pack.saving" class="text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-500/10 px-3 py-1 rounded-full inline-block">
                  ✨ ¡Ahorra {{ pack.saving }}!
                </div>
              </div>
            </div>

            <div class="w-full mt-8 relative z-10">
              <button (click)="buyPack(pack.code)" [disabled]="isProcessingCheckout() !== null || !subService.paymentsEnabled()" 
                class="w-full py-4 btn-secondary text-primary hover:text-primary-hover text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <span *ngIf="isProcessingCheckout() === pack.code" class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                <span *ngIf="isProcessingCheckout() !== pack.code">Comprar con Mercado Pago</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer terms / detail -->
        <div class="bg-surface-subtle border border-border rounded-[2rem] p-6 md:p-8 flex items-start gap-4 max-w-4xl mx-auto relative overflow-hidden">
          <div class="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-[50px] rounded-full"></div>
          <div class="w-10 h-10 rounded-2xl bg-primary-glow border border-primary/20 flex items-center justify-center shrink-0">
            <app-icon name="info" class="text-primary text-lg"></app-icon>
          </div>
          <div class="text-xs text-text-dim leading-relaxed space-y-3 relative z-10">
            <h4 class="font-bold text-text-main text-sm">Información Importante sobre tu Compra</h4>
            <p>
              El saldo de mensajes comprados se acreditará de forma automática en tu cuenta al confirmarse el pago en Mercado Pago.
            </p>
            <p>
              Los paquetes adquiridos se utilizarán únicamente <strong>una vez agotado tu plan</strong> mensual contratado. Tienen una validez de <strong>3 meses</strong> a partir del momento de la compra. En caso de contar con múltiples paquetes cargados, el sistema consumirá en primer lugar el paquete cuya fecha de vencimiento sea la más próxima, asegurando que tus créditos no expiren.
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WhatsappPacksComponent implements OnInit {
  public subService = inject(SubscriptionService);
  private snackbar = inject(SnackbarService);
  
  public isProcessingCheckout = signal<string | null>(null);

  wppPacks = [
    { code: 'WPP_PACK_100', name: 'Pack Básico', quantity: 100, price: 6000, saving: null },
    { code: 'WPP_PACK_500', name: 'Pack Avanzado', quantity: 500, price: 25000, saving: '16.6%' },
    { code: 'WPP_PACK_1000', name: 'Pack Premium', quantity: 1000, price: 40000, saving: '33.3%' }
  ];

  async ngOnInit() {
    try {
      await Promise.all([
        this.subService.loadStatus(),
        this.subService.loadConfig()
      ]);
    } catch (err) {
      console.error('Error al cargar datos de facturación:', err);
    }
  }

  async buyPack(packCode: string) {
    if (this.isProcessingCheckout() !== null) return;
    this.isProcessingCheckout.set(packCode);
    try {
      const response = await this.subService.checkoutPack(packCode);
      if (response && response.initPoint) {
        window.location.href = response.initPoint;
      } else {
        throw new Error('No se recibió el enlace de pago de Mercado Pago.');
      }
    } catch (error: any) {
      console.error('Error al crear checkout de pack:', error);
      this.snackbar.error(error?.error?.message || 'No se pudo iniciar el proceso de pago. Intenta de nuevo.');
      this.isProcessingCheckout.set(null);
    }
  }
}
