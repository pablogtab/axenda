import {
  Component,
  inject,
  signal,
  ViewChild,
  AfterViewInit,
} from '@angular/core';

declare var google: any;
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { environment } from '@env/environment';
import { TurnstileComponent } from '@shared/components/turnstile.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TurnstileComponent],
  template: `
    <div
      class="relative min-h-dvh flex items-center justify-center bg-bg-primary overflow-hidden"
    >
      <!-- Fondo Decorativo (Glows) -->
      <div
        class="absolute -top-[10%] -left-[10%] w-[40%] h-[60%] bg-[radial-gradient(circle,var(--color-primary-glow)_0%,transparent_70%)] blur-[80px] z-0"
      ></div>
      <div
        class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_70%)] blur-[80px] z-0"
      ></div>

      <!-- Card de Login -->
      <div class="card-glass w-full max-w-[420px] !p-12 z-10 relative">
        <div class="text-center mb-10 flex flex-col items-center">
          <div class="flex items-center gap-0 group">
            <img
              src="assets/logo.svg"
              alt="Axenda Logo"
              class="w-16 h-16 drop-shadow-2xl animate-in zoom-in duration-700"
            />
            <h1
              class="text-5xl font-extrabold tracking-tighter text-gradient -ml-2.5"
            >
              xenda
            </h1>
          </div>
          <p class="text-text-muted mt-2">Gestión profesional de turnos</p>
        </div>

        <form
          [formGroup]="loginForm"
          (ngSubmit)="onSubmit()"
          class="flex flex-col gap-6"
        >
          <div class="flex flex-col gap-2">
            <label for="email" class="text-sm font-semibold text-text-muted"
              >Correo Electrónico</label
            >
            <input
              type="email"
              id="email"
              formControlName="email"
              placeholder="admin@axenda.com"
              class="input-field"
              [class.!border-error]="
                loginForm.get('email')?.invalid &&
                loginForm.get('email')?.touched
              "
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="text-sm font-semibold text-text-muted"
              >Contraseña</label
            >
            <div class="relative">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                formControlName="password"
                placeholder="••••••••"
                class="input-field pr-12"
                [class.!border-error]="
                  loginForm.get('password')?.invalid &&
                  loginForm.get('password')?.touched
                "
              />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-dim hover:text-primary transition-colors focus:outline-none"
              >
                @if (showPassword()) {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M9.88 9.88L14.12 14.12" />
                    <path d="M2 2l20 20" />
                    <path d="M10.37 10.37a4 4 0 1 0 5.26 5.26" />
                    <path d="M22.92 12.14a11 11 0 0 0-4.13-5.26" />
                    <path d="M15.42 15.42a11 11 0 0 1-14.34-3.28" />
                    <path d="M12 4.54a11 11 0 0 1 7.3 2.73" />
                    <path d="M5.58 5.58a11 11 0 0 0-3.5 6.56" />
                  </svg>
                } @else {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
              </button>
            </div>
          </div>

          @if (errorMessage) {
            <div
              class="bg-error/10 border border-error text-error p-3 rounded-xl text-sm text-center mb-6 animate-in fade-in slide-in-from-top-2"
            >
              {{ errorMessage }}
            </div>
          }

          @if (!skipTurnstile) {
            <div class="mt-2 flex justify-center min-h-[65px]">
              <app-turnstile
                (resolved)="turnstileToken.set($event)"
              ></app-turnstile>
            </div>
          }

          <button
            type="submit"
            class="btn-primary w-full mt-2 group"
            [disabled]="loginForm.invalid || !turnstileToken() || isLoading"
          >
            @if (!isLoading) {
              <span class="flex items-center justify-center gap-2">
                Iniciar Sesión
                <span class="transition-transform group-hover:translate-x-1"
                  >→</span
                >
              </span>
            } @else {
              <div class="flex justify-center">
                <div
                  class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></div>
              </div>
            }
          </button>

          <!-- Divisor con texto -->
          <div class="relative mt-4">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-border"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-[var(--color-surface)] px-2 text-text-dim"
                >O continúa con</span
              >
            </div>
          </div>

          <!-- Contenedor del Botón de Google -->
          <div class="flex justify-center mt-4 min-h-[40px] w-full">
            <div
              id="google-btn"
              [class.hidden]="isGoogleLoading"
              [class.pointer-events-none]="isLoading"
            ></div>
            @if (isGoogleLoading) {
              <div
                class="flex justify-center items-center h-10 w-[320px] max-w-full rounded-full border border-border bg-surface-subtle/50 animate-in fade-in zoom-in-95 duration-300"
              >
                <div
                  class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
                ></div>
                <span class="ml-2 text-sm font-medium text-text-muted"
                  >Conectando con Google...</span
                >
              </div>
            }
          </div>
        </form>

        <div class="mt-10 text-center text-sm text-text-dim">
          <p>
            ¿No tienes cuenta?
            <a
              routerLink="/register"
              class="text-primary hover:underline font-semibold"
              >Regístrate gratis</a
            >
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  @ViewChild(TurnstileComponent) turnstile!: TurnstileComponent;

  turnstileToken = signal<string | null>(
    environment.skipTurnstile ? 'skipped' : null,
  );
  skipTurnstile = environment.skipTurnstile;
  showPassword = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  isLoading = false;
  isGoogleLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    if (!environment.production) {
      this.loginForm.patchValue({
        email: 'admin@axenda.com',
        password: 'Password123!',
      });
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = {
        email: this.loginForm.value.email!,
        password: this.loginForm.value.password!,
        turnstileToken: this.turnstileToken()!,
      };

      this.authService.login(credentials).subscribe({
        next: (data) => {
          if (data.onboardingCompleted) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/getting-started']);
          }
        },
        error: (err) => {
          this.isLoading = false;
          const msg =
            err.error?.error?.message ||
            err.error?.message ||
            'Credenciales inválidas o error de conexión.';
          this.errorMessage = msg;

          if (!this.skipTurnstile) {
            this.turnstileToken.set(null);
            this.turnstile.reset();
          }
        },
      });
    }
  }

  ngAfterViewInit() {
    this.initGoogleButton();
  }

  private initGoogleButton(retries = 0) {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleLogin(response),
      });

      google.accounts.id.renderButton(document.getElementById('google-btn'), {
        theme: 'outline',
        size: 'large',
        width: '320',
        shape: 'pill',
      });
    } else if (retries < 10) {
      // Reintentar cada 200ms hasta 10 veces si el script no ha cargado
      setTimeout(() => this.initGoogleButton(retries + 1), 200);
    }
  }

  handleGoogleLogin(response: any) {
    this.isLoading = true;
    this.isGoogleLoading = true;
    this.authService
      .googleLogin(response.credential, this.turnstileToken())
      .subscribe({
        next: (data) => {
          if (data.onboardingCompleted) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/getting-started']);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.isGoogleLoading = false;
          const msg =
            err.error?.error?.message ||
            err.error?.message ||
            'Error al iniciar sesión con Google';
          this.errorMessage = msg;
          if (!this.skipTurnstile) {
            this.turnstileToken.set(null);
            this.turnstile.reset();
          }
        },
      });
  }
}
