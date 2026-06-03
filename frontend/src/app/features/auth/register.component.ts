import {
  Component,
  inject,
  signal,
  ViewChild,
  AfterViewInit,
  OnInit,
  effect,
} from '@angular/core';

declare var google: any;
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { TurnstileComponent } from '@shared/components/turnstile.component';
import { environment } from '@env/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TurnstileComponent],
  template: `
    <div
      class="relative min-h-dvh flex items-center justify-center bg-bg-primary overflow-hidden py-12 px-4"
    >
      <!-- Fondo Decorativo (Glows) -->
      <div
        class="absolute -top-[10%] -left-[10%] w-[40%] h-[60%] bg-[radial-gradient(circle,var(--color-primary-glow)_0%,transparent_70%)] blur-[80px] z-0"
      ></div>
      <div
        class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_70%)] blur-[80px] z-0"
      ></div>

      <!-- Card de Registro -->
      <div class="card-glass w-full max-w-[460px] !p-10 md:!p-12 z-10 relative">
        <div class="text-center mb-10 flex flex-col items-center">
          <div
            class="flex items-center gap-0 group cursor-pointer"
            routerLink="/"
          >
            <img
              src="assets/logo.svg"
              alt="Axenda Logo"
              class="w-14 h-14 drop-shadow-2xl animate-in zoom-in duration-700"
            />
            <h1
              class="text-4xl font-extrabold tracking-tighter text-gradient -ml-2"
            >
              xenda
            </h1>
          </div>
          <h2 class="text-2xl font-bold mt-4">Comienza ahora</h2>
          <p class="text-text-muted mt-1 text-sm">
            Crea tu organización en segundos
          </p>
        </div>

        <!-- Indicador de Pasos -->
        <div class="flex justify-center gap-2 mb-8">
          <div
            class="h-1.5 w-12 rounded-full transition-all duration-300"
            [class.bg-primary]="step() === 1"
            [class.bg-surface-subtle-hover]="step() !== 1"
          ></div>
          <div
            class="h-1.5 w-12 rounded-full transition-all duration-300"
            [class.bg-primary]="step() === 2"
            [class.bg-surface-subtle-hover]="step() !== 2"
          ></div>
        </div>

        <!-- Mensaje de Error Global -->
        @if (errorMessage()) {
          <div
            class="bg-error/10 border border-error text-error p-3 rounded-xl text-sm text-center mb-6 animate-in fade-in slide-in-from-top-2"
          >
            {{ errorMessage() }}
          </div>
        }

        <!-- PASO 1: Organización y Email -->
        @if (step() === 1) {
          <form
            [formGroup]="step1Form"
            (ngSubmit)="onNext()"
            class="flex flex-col gap-5 animate-in slide-in-from-left duration-300"
          >
            <div class="flex flex-col gap-2">
              <label for="orgName" class="text-sm font-semibold text-text-muted"
                >Nombre de tu empresa</label
              >
              <input
                type="text"
                id="orgName"
                formControlName="organizationName"
                placeholder="Axenda"
                class="input-field"
                [class.!border-error]="
                  step1Form.get('organizationName')?.invalid &&
                  step1Form.get('organizationName')?.touched
                "
              />
              @if (
                step1Form.get('organizationName')?.invalid &&
                step1Form.get('organizationName')?.touched
              ) {
                <span class="text-[10px] text-error ml-1"
                  >Mínimo 3 caracteres</span
                >
              }
            </div>

            <div class="flex flex-col gap-2">
              <label for="email" class="text-sm font-semibold text-text-muted"
                >Correo</label
              >
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="tu_correo@axenda.ar"
                autocomplete="email"
                class="input-field"
                [class.!border-error]="
                  step1Form.get('email')?.invalid &&
                  step1Form.get('email')?.touched
                "
              />
              @if (
                step1Form.get('email')?.invalid &&
                step1Form.get('email')?.touched
              ) {
                <span class="text-[10px] text-error ml-1"
                  >Ingresa un correo válido</span
                >
              }
            </div>

            @if (!skipTurnstile) {
              <div class="mt-4 flex justify-center min-h-[65px]">
                <app-turnstile
                  (resolved)="turnstileToken.set($event)"
                ></app-turnstile>
              </div>
            }

            <button
              type="submit"
              class="btn-primary w-full mt-4 group"
              [disabled]="step1Form.invalid || !turnstileToken() || isLoading()"
            >
              @if (!isLoading()) {
                <span class="flex items-center justify-center gap-2">
                  Continuar
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
                  >O regístrate con</span
                >
              </div>
            </div>

            <!-- Contenedor del Botón de Google -->
            <div class="flex justify-center mt-4 min-h-[40px] w-full">
              <div
                id="google-btn"
                class="w-full flex justify-center"
                [class.hidden]="isGoogleLoading()"
                [class.pointer-events-none]="isLoading()"
              ></div>
              @if (isGoogleLoading()) {
                <div
                  class="flex justify-center items-center h-10 w-[360px] max-w-full rounded-full border border-border bg-surface-subtle/50 animate-in fade-in zoom-in-95 duration-300"
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
        }

        <!-- PASO 2: Verificación y Datos -->
        @if (step() === 2) {
          <form
            [formGroup]="step2Form"
            (ngSubmit)="onSubmit()"
            class="flex flex-col gap-5 animate-in slide-in-from-right duration-300"
          >
            <!-- Campo invisible pero detectable por el navegador para asociar el usuario -->
            <input
              type="text"
              name="username"
              [value]="step1Form.get('email')?.value"
              autocomplete="username"
              class="sr-only"
              tabindex="-1"
            />

            <div
              class="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-2"
            >
              <p class="text-xs text-center text-text-muted">
                Hemos enviado un código a <br />
                <span class="text-primary font-bold">{{
                  step1Form.value.email
                }}</span>
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <label for="code" class="text-sm font-semibold text-text-muted"
                >Código de Verificación</label
              >
              <input
                type="text"
                id="code"
                formControlName="code"
                placeholder="000000"
                maxlength="6"
                spellcheck="false"
                (keypress)="onlyNumbers($event)"
                class="input-field text-center text-xl tracking-[1em] font-mono"
                [class.!border-error]="
                  step2Form.get('code')?.invalid &&
                  step2Form.get('code')?.touched
                "
              />
              @if (
                step2Form.get('code')?.invalid && step2Form.get('code')?.touched
              ) {
                <span class="text-[10px] text-error text-center"
                  >Deben ser 6 números</span
                >
              }
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label
                  for="firstName"
                  class="text-sm font-semibold text-text-muted"
                  >Nombre</label
                >
                <input
                  type="text"
                  id="firstName"
                  formControlName="firstName"
                  placeholder="Nombre"
                  autocomplete="given-name"
                  class="input-field"
                  [class.!border-error]="
                    step2Form.get('firstName')?.invalid &&
                    step2Form.get('firstName')?.touched
                  "
                />
              </div>
              <div class="flex flex-col gap-2">
                <label
                  for="lastName"
                  class="text-sm font-semibold text-text-muted"
                  >Apellido</label
                >
                <input
                  type="text"
                  id="lastName"
                  formControlName="lastName"
                  placeholder="Apellido"
                  autocomplete="family-name"
                  class="input-field"
                  [class.!border-error]="
                    step2Form.get('lastName')?.invalid &&
                    step2Form.get('lastName')?.touched
                  "
                />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label
                for="password"
                class="text-sm font-semibold text-text-muted"
                >Contraseña</label
              >
              <div class="relative group/pass">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  maxlength="128"
                  class="input-field pr-12"
                  [class.!border-error]="
                    step2Form.get('password')?.invalid &&
                    step2Form.get('password')?.touched
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

              <!-- Indicador de Fuerza -->
              <div class="flex flex-col gap-1.5 px-1 mt-0.5">
                <div class="flex justify-between items-center">
                  <span
                    class="text-[9px] uppercase tracking-wider text-text-dim font-bold"
                    >Seguridad</span
                  >
                  <span
                    class="text-[9px] font-bold"
                    [class.text-error]="getPasswordStrength().label === 'Débil'"
                    [class.text-warning]="
                      getPasswordStrength().label === 'Media'
                    "
                    [class.text-success]="
                      getPasswordStrength().label === 'Fuerte'
                    "
                  >
                    {{ getPasswordStrength().label }}
                  </span>
                </div>
                <div
                  class="h-1 w-full bg-surface-subtle-hover rounded-full overflow-hidden flex gap-0.5"
                >
                  <div
                    class="h-full transition-all duration-500"
                    [style.width]="getPasswordStrength().score * 20 + '%'"
                    [ngClass]="getPasswordStrength().color"
                  ></div>
                </div>
              </div>

              @if (
                step2Form.get('password')?.invalid &&
                step2Form.get('password')?.touched
              ) {
                <span class="text-[10px] text-error ml-1"
                  >Mínimo 8 caracteres</span
                >
              }
            </div>

            <div class="flex flex-col gap-2">
              <label
                for="confirmPassword"
                class="text-sm font-semibold text-text-muted"
                >Confirmar Contraseña</label
              >
              <div class="relative group/pass">
                <input
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  id="confirmPassword"
                  formControlName="confirmPassword"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  maxlength="128"
                  class="input-field pr-12"
                  [class.!border-error]="
                    (step2Form.get('confirmPassword')?.touched ||
                      step2Form.dirty) &&
                    step2Form.hasError('passwordMismatch')
                  "
                />
                <button
                  type="button"
                  (click)="showConfirmPassword.set(!showConfirmPassword())"
                  class="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-dim hover:text-primary transition-colors focus:outline-none"
                >
                  @if (showConfirmPassword()) {
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
              @if (
                (step2Form.get('confirmPassword')?.touched ||
                  step2Form.dirty) &&
                step2Form.hasError('passwordMismatch')
              ) {
                <span class="text-[10px] text-error ml-1"
                  >Las contraseñas no coinciden</span
                >
              }
            </div>

            <div class="flex gap-4 mt-4">
              <button
                type="button"
                class="btn-secondary flex-1"
                (click)="goBack()"
                [disabled]="isLoading()"
              >
                Atrás
              </button>
              <button
                type="submit"
                class="btn-primary flex-[2] group"
                [disabled]="step2Form.invalid || isLoading()"
              >
                @if (!isLoading()) {
                  <span class="flex items-center justify-center gap-2">
                    Crear Cuenta
                    <span class="transition-transform group-hover:scale-110"
                      >✨</span
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
            </div>
          </form>
        }

        <div class="mt-10 text-center text-sm text-text-dim">
          <p>
            ¿Ya tienes cuenta?
            <a
              routerLink="/login"
              class="text-primary hover:underline font-semibold cursor-pointer"
              >Inicia sesión</a
            >
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent implements AfterViewInit, OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  @ViewChild(TurnstileComponent) turnstile!: TurnstileComponent;

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const ref = params['ref'];
      if (ref) {
        localStorage.setItem('referral_code', ref);
      }
    });
  }

  // Signals para el estado
  step = signal<1 | 2>(1);
  isLoading = signal(false);
  isGoogleLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  turnstileToken = signal<string | null>(
    environment.skipTurnstile ? 'skipped' : null,
  );
  skipTurnstile = environment.skipTurnstile;

  // Formulario Paso 1: Organización y Email
  step1Form = this.fb.group({
    organizationName: ['', [Validators.required, Validators.minLength(3)]],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
      ],
    ],
  });

  // Formulario Paso 2: Datos Personales y Verificación
  step2Form = this.fb.group(
    {
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  passwordMatchValidator(control: any) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    return password &&
      confirmPassword &&
      password.value === confirmPassword.value
      ? null
      : { passwordMismatch: true };
  }

  getPasswordStrength(): { score: number; label: string; color: string } {
    const pwd = this.step2Form.value.password || '';
    if (!pwd) return { score: 0, label: '', color: 'bg-white/10' };

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: 'Débil', color: 'bg-error' };
    if (score <= 4) return { score, label: 'Media', color: 'bg-warning' };
    return { score, label: 'Fuerte', color: 'bg-success' };
  }

  onNext(): void {
    if (this.step1Form.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const data = {
        organizationName: this.step1Form.value.organizationName!,
        email: this.step1Form.value.email!,
        turnstileToken: this.turnstileToken()!,
      };

      this.authService.registerStart(data).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.step2Form.markAsUntouched();
          this.step2Form.markAsPristine();
          this.step.set(2);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg =
            err.error?.error?.message ||
            err.error?.message ||
            'Error al iniciar el registro. Reintente.';
          this.errorMessage.set(msg);

          if (!this.skipTurnstile) {
            this.turnstileToken.set(null);
            this.turnstile.reset();
          }
        },
      });
    }
  }

  onSubmit(): void {
    if (this.step2Form.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const data = {
        email: this.step1Form.value.email!,
        code: this.step2Form.value.code!,
        firstName: this.step2Form.value.firstName!,
        lastName: this.step2Form.value.lastName!,
        password: this.step2Form.value.password!,
      };

      this.authService.registerComplete(data).subscribe({
        next: (res) => {
          if (res.onboardingCompleted) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/getting-started']);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg =
            err.error?.error?.message ||
            err.error?.message ||
            'Código inválido o error al completar registro.';
          this.errorMessage.set(msg);
        },
      });
    }
  }

  goBack(): void {
    this.step.set(1);
    this.errorMessage.set('');
    // Re-inicializar el botón de Google al volver al paso 1
    setTimeout(() => this.initGoogleButton(), 0);
  }

  ngAfterViewInit() {
    this.initGoogleButton();
  }

  private initGoogleButton(retries = 0) {
    const btnContainer = document.getElementById('google-btn');
    if (typeof google !== 'undefined' && btnContainer) {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleLogin(response),
      });

      const parentWidth = btnContainer.parentElement?.clientWidth || 320;
      const finalWidth = Math.min(parentWidth, 360).toString();

      google.accounts.id.renderButton(btnContainer, {
        theme: 'outline',
        size: 'large',
        width: finalWidth,
        shape: 'pill',
      });
    } else if (retries < 10) {
      setTimeout(() => this.initGoogleButton(retries + 1), 200);
    }
  }

  handleGoogleLogin(response: any) {
    this.isLoading.set(true);
    this.isGoogleLoading.set(true);
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
          this.isLoading.set(false);
          this.isGoogleLoading.set(false);
          const msg =
            err.error?.error?.message ||
            err.error?.message ||
            'Error al iniciar sesión con Google';
          this.errorMessage.set(msg);
          if (!this.skipTurnstile) {
            this.turnstileToken.set(null);
            this.turnstile.reset();
          }
        },
      });
  }

  onlyNumbers(event: KeyboardEvent): void {
    const pattern = /[0-9]/;
    const inputChar = String.fromCharCode(event.charCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }
}
