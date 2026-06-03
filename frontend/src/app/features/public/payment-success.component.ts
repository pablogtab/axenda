import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '@shared/components/icon.component';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, IconComponent, RouterLink],
  template: `
    <div
      class="relative min-h-dvh flex items-center justify-center bg-bg-primary overflow-hidden p-4"
    >
      <!-- Fondo Decorativo (Glows de la Guía de Estilo) -->
      <div
        class="absolute -top-[10%] -left-[10%] w-[40%] h-[60%] bg-[radial-gradient(circle,var(--color-primary-glow)_0%,transparent_70%)] blur-[80px] z-0"
      ></div>
      <div
        class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_70%)] blur-[80px] z-0"
      ></div>

      <!-- Card de Éxito de Pago con Glassmorphism -->
      <div
        class="card-glass w-full max-w-[440px] !p-8 md:!p-10 z-10 relative overflow-hidden text-center border border-border/30"
      >
        <!-- Glow dinámico de estado en el fondo de la tarjeta -->
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[90px] opacity-25 z-0"
          [class.bg-success]="status() === 'success'"
          [class.bg-warning]="status() === 'pending'"
          [class.bg-primary]="status() === 'verifying'"
          [class.bg-error]="status() === 'error'"
        ></div>

        <div class="relative z-10 flex flex-col items-center">
          <!-- Logo de la aplicación -->
          <div class="flex items-center gap-0 group mb-8">
            <img
              src="assets/logo.svg"
              alt="Axenda Logo"
              class="w-12 h-12 drop-shadow-2xl"
            />
            <h1
              class="text-4xl font-extrabold tracking-tighter text-gradient -ml-1.5"
            >
              xenda
            </h1>
          </div>

          <!-- 1. Estado: Verificando -->
          @if (status() === 'verifying') {
            <div
              class="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/5 relative"
            >
              <div
                class="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"
              ></div>
              <app-icon
                name="sync"
                class="text-3xl text-primary animate-pulse"
              ></app-icon>
            </div>
            <h2 class="text-2xl font-black text-text-main mb-3">
              Verificando Pago
            </h2>
            <p class="text-text-muted text-sm leading-relaxed mb-6">
              Estamos confirmando tu transacción de forma segura con Mercado
              Pago. Esto tomará solo unos segundos.
            </p>
          }

          <!-- 2. Estado: Éxito -->
          @if (status() === 'success') {
            <div
              class="w-20 h-20 bg-success/10 border border-success/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-success/15 animate-in zoom-in duration-500"
            >
              <app-icon
                name="check_circle"
                class="text-4xl text-success"
              ></app-icon>
            </div>

            <h2 class="text-2xl font-black text-text-main mb-1">
              ¡Pago Acreditado!
            </h2>
            <p class="text-success text-sm font-semibold mb-6">
              Transacción procesada correctamente
            </p>

            <!-- Caso: Usuario Autenticado en esta sesión -->
            @if (isLoggedIn()) {
              <p class="text-text-muted text-sm leading-relaxed mb-8">
                Tu cuenta ha sido actualizada con los nuevos beneficios y
                límites. Serás redirigido a tu panel en breve.
              </p>
              <button
                (click)="goToDashboard()"
                class="btn-primary w-full py-3.5 cursor-pointer"
              >
                Ir al Panel
              </button>
            } @else {
              <!-- Caso: Usuario NO Autenticado en esta sesión (Redirección cross-browser en móvil) -->
              <div
                class="bg-surface-subtle border border-border/40 p-5 rounded-2xl text-left mb-8 max-w-full"
              >
                <span
                  class="text-text-main font-bold text-sm block mb-1 flex items-center gap-1.5"
                >
                  <app-icon
                    name="devices"
                    class="text-primary text-[18px]"
                  ></app-icon>
                  ¿No estás en tu navegador habitual?
                </span>
                <p class="text-text-muted text-xs leading-relaxed">
                  ¡No te preocupes! El pago ya fue registrado en el sistema.
                  Puedes <strong>cerrar esta pestaña de forma segura</strong> y
                  regresar al navegador original o aplicación (como WhatsApp o
                  tu sesión habitual) donde ya verás reflejada tu suscripción.
                </p>
              </div>
              <button
                routerLink="/login"
                class="btn-secondary w-full py-3.5 cursor-pointer"
              >
                Iniciar Sesión Aquí
              </button>
            }
          }

          <!-- 3. Estado: Pendiente -->
          @if (status() === 'pending') {
            <div
              class="w-20 h-20 bg-warning/10 border border-warning/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-warning/15"
            >
              <app-icon
                name="schedule"
                class="text-4xl text-warning"
              ></app-icon>
            </div>

            <h2 class="text-2xl font-black text-text-main mb-1">
              Pago en Proceso
            </h2>
            <p class="text-warning text-sm font-semibold mb-6">
              Mercado Pago está procesando la transacción
            </p>

            <!-- Caso: Usuario Autenticado -->
            @if (isLoggedIn()) {
              <p class="text-text-muted text-sm leading-relaxed mb-8">
                Esto puede tomar unos minutos dependiendo del medio de pago. En
                cuanto se apruebe, tu cuenta se actualizará automáticamente.
              </p>
              <button
                (click)="goToDashboard()"
                class="btn-primary w-full py-3.5 cursor-pointer"
              >
                Ir al Panel
              </button>
            } @else {
              <!-- Caso: Usuario NO Autenticado -->
              <div
                class="bg-surface-subtle border border-border/40 p-5 rounded-2xl text-left mb-8 max-w-full"
              >
                <span
                  class="text-text-main font-bold text-sm block mb-1 flex items-center gap-1.5"
                >
                  <app-icon
                    name="info"
                    class="text-warning text-[18px]"
                  ></app-icon>
                  Puedes cerrar esta ventana
                </span>
                <p class="text-text-muted text-xs leading-relaxed">
                  Tu pago está en camino. Una vez que Mercado Pago lo confirme,
                  el plan se habilitará en tu cuenta. Ya puedes cerrar esta
                  pestaña y volver a tu navegador principal.
                </p>
              </div>
              <button
                routerLink="/login"
                class="btn-secondary w-full py-3.5 cursor-pointer"
              >
                Iniciar Sesión Aquí
              </button>
            }
          }

          <!-- 4. Estado: Error / Fallido -->
          @if (status() === 'error') {
            <div
              class="w-20 h-20 bg-error/10 border border-error/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-error/15"
            >
              <app-icon name="error" class="text-4xl text-error"></app-icon>
            </div>

            <h2 class="text-2xl font-black text-text-main mb-1">
              Hubo un Problema
            </h2>
            <p class="text-error text-sm font-semibold mb-6">
              No pudimos confirmar tu pago
            </p>

            <p class="text-text-muted text-sm leading-relaxed mb-8">
              Mercado Pago no ha confirmado la transacción. Si el importe ya fue
              descontado de tu cuenta, no te preocupes: el sistema procesará la
              notificación automáticamente en unos momentos y actualizará tu
              plan.
            </p>

            @if (isLoggedIn()) {
              <button
                (click)="goToDashboard()"
                class="btn-primary w-full py-3.5 mb-3 cursor-pointer"
              >
                Volver a Configuración
              </button>
            }
            <button
              routerLink="/login"
              class="btn-secondary w-full py-3.5 cursor-pointer"
            >
              Ir al Inicio de Sesión
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class PaymentSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptionService = inject(SubscriptionService);
  private authService = inject(AuthService);

  status = signal<'verifying' | 'success' | 'pending' | 'error'>('verifying');
  isLoggedIn = signal<boolean>(false);

  ngOnInit() {
    this.isLoggedIn.set(!!this.authService.getAccessToken());

    this.route.queryParams.subscribe((params) => {
      // Mercado Pago puede retornar el ID en diferentes parámetros según el tipo de pago
      const paymentId =
        params['payment_id'] ||
        params['collection_id'] ||
        params['preapproval_id'];

      if (!paymentId) {
        // Si no viene ID, podría ser un abandono o error del checkout
        this.status.set('error');
        return;
      }

      this.verifyWithBackend(paymentId);
    });
  }

  async verifyWithBackend(paymentId: string) {
    try {
      const result =
        await this.subscriptionService.verifySubscriptionPublic(paymentId);

      if (result.success) {
        if (result.status === 'approved') {
          this.status.set('success');

          // Si está logueado en este navegador, recargamos el estado de su suscripción
          if (this.isLoggedIn()) {
            await this.subscriptionService.loadStatus();
            setTimeout(() => {
              if (this.status() === 'success') {
                this.goToDashboard();
              }
            }, 3000);
          }
        } else if (
          result.status === 'pending' ||
          result.status === 'in_process'
        ) {
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
    this.router.navigate(['/dashboard/settings'], {
      queryParams: { section: 'billing' },
    });
  }
}
