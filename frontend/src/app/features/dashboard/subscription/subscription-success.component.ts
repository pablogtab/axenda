import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-subscription-success',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="min-h-[70vh] flex items-center justify-center p-4">
      <div class="glass p-10 rounded-[2.5rem] border border-border relative overflow-hidden max-w-md w-full text-center">
        <!-- Glow background -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px]"
             [class.bg-emerald-500]="status() === 'success'"
             [class.bg-amber-500]="status() === 'pending'"
             [class.bg-primary]="status() === 'verifying'"
             [class.bg-red-500]="status() === 'error'">
        </div>

        <div class="relative z-10 flex flex-col items-center">
          
          <!-- Verifying State -->
          <ng-container *ngIf="status() === 'verifying'">
            <div class="w-20 h-20 bg-surface-subtle border border-border rounded-full flex items-center justify-center mb-6 shadow-xl relative">
              <div class="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
              <app-icon name="sync" class="text-3xl text-primary animate-pulse"></app-icon>
            </div>
            <h2 class="text-2xl font-black text-text-main mb-2">Verificando Pago...</h2>
            <p class="text-text-muted text-sm">
              Estamos confirmando tu suscripción de forma segura con Mercado Pago. Esto tomará solo unos segundos.
            </p>
          </ng-container>

          <!-- Success State -->
          <ng-container *ngIf="status() === 'success'">
            <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
              <app-icon name="check_circle" class="text-4xl text-emerald-500"></app-icon>
            </div>
            <h2 class="text-2xl font-black text-text-main mb-2">¡Suscripción Activa!</h2>
            <p class="text-emerald-400 text-sm font-medium mb-8">
              El pago fue procesado correctamente.
            </p>
            <p class="text-text-muted text-sm mb-8">
              Tu cuenta ha sido actualizada con los nuevos beneficios y límites. Serás redirigido a tu panel en breve.
            </p>
            <button (click)="goToDashboard()" class="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer">
              Ir al Panel
            </button>
          </ng-container>

          <!-- Pending State -->
          <ng-container *ngIf="status() === 'pending'">
            <div class="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20">
              <app-icon name="schedule" class="text-4xl text-amber-500"></app-icon>
            </div>
            <h2 class="text-2xl font-black text-text-main mb-2">Pago en Proceso</h2>
            <p class="text-amber-400 text-sm font-medium mb-8">
              Mercado Pago está procesando tu transacción.
            </p>
            <p class="text-text-muted text-sm mb-8">
              Esto puede tardar unos minutos (o hasta que pagues en el punto de venta). No te preocupes, en cuanto se apruebe, tu cuenta se activará automáticamente.
            </p>
            <button (click)="goToDashboard()" class="w-full py-4 bg-surface-subtle hover:bg-surface-subtle-hover border border-border text-text-main font-bold rounded-2xl transition-all cursor-pointer">
              Entendido
            </button>
          </ng-container>

          <!-- Error State -->
          <ng-container *ngIf="status() === 'error'">
            <div class="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-500/20">
              <app-icon name="error" class="text-4xl text-red-500"></app-icon>
            </div>
            <h2 class="text-2xl font-black text-text-main mb-2">Hubo un problema</h2>
            <p class="text-red-400 text-sm font-medium mb-8">
              No pudimos confirmar tu pago
            </p>
            <p class="text-text-muted text-sm mb-8">
              Mercado Pago no ha confirmado la suscripción o ha sido rechazada. Revisa tu estado de cuenta o intenta nuevamente.
            </p>
            <button (click)="goToDashboard()" class="w-full py-4 bg-surface-subtle hover:bg-surface-subtle-hover border border-border text-text-main font-bold rounded-2xl transition-all cursor-pointer">
              Volver a Configuración
            </button>
          </ng-container>

        </div>
      </div>
    </div>
  `
})
export class SubscriptionSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptionService = inject<SubscriptionService>(SubscriptionService);

  status = signal<'verifying' | 'success' | 'pending' | 'error'>('verifying');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      // Mercado Pago puede devolver el ID en diferentes parámetros según el tipo de pago
      const paymentId = params['payment_id'] || params['collection_id'] || params['preapproval_id'];

      if (!paymentId) {
        this.status.set('error');
        return;
      }

      this.verifyWithBackend(paymentId);
    });
  }

  async verifyWithBackend(paymentId: string) {
    try {
      const result = await this.subscriptionService.verifySubscription(paymentId);

      if (result.success) {
        if (result.status === 'approved') {
          this.status.set('success');
          await this.subscriptionService.loadStatus();
          
          setTimeout(() => {
            if (this.status() === 'success') {
              this.goToDashboard();
            }
          }, 3000);
        } else if (result.status === 'pending' || result.status === 'in_process') {
          this.status.set('pending');
        } else {
          this.status.set('error');
        }
      } else {
        this.status.set('error');
      }
    } catch (error) {
      this.status.set('error');
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard/settings'], { queryParams: { section: 'billing' } });
  }
}
