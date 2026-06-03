import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TenantsService } from '@services/tenants.service';
import { AuthService } from '@services/auth.service';
import { IconComponent } from '@shared/components/icon.component';
import { TimeInputComponent } from '@shared/components/time-input';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TimeInputComponent],
  template: `
    <div
      class="relative min-h-dvh flex items-center justify-center bg-bg-primary overflow-hidden"
    >
      <!-- Fondo Decorativo -->
      <div
        class="absolute -top-[10%] -left-[10%] w-[40%] h-[60%] bg-[radial-gradient(circle,var(--color-primary-glow)_0%,transparent_70%)] blur-[80px] z-0"
      ></div>
      <div
        class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_70%)] blur-[80px] z-0"
      ></div>

      <div
        class="card-glass w-full max-w-[500px] z-10 relative transition-all duration-500"
      >
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gradient mb-2">Hola!</h1>
          <p class="text-text-muted">Personalicemos tu experiencia en Axenda</p>
        </div>

        <div class="progress-bar">
          <div
            class="progress-fill"
            [style.width.%]="(currentStep() / 5) * 100"
          ></div>
        </div>

        <!-- Step 1: Business Profile -->
        <div
          class="step-container"
          [class.step-active]="currentStep() === 1"
          [class.step-inactive]="currentStep() !== 1"
        >
          <div class="max-w-md mx-auto space-y-8">
            <div class="text-center">
              <p
                class="text-xs font-bold text-primary uppercase tracking-widest mb-2"
              >
                Paso 1 de 5
              </p>
              <h3 class="text-2xl font-black">Tu Marca</h3>
              <p class="text-sm text-text-muted">¿Cómo se llama tu negocio?</p>
            </div>

            <div class="space-y-6">
              <input
                type="text"
                [ngModel]="businessName()"
                (ngModelChange)="businessName.set($event)"
                placeholder="Nombre de tu marca"
                class="input-field h-16 text-xl text-center font-black"
              />
              <p class="text-[10px] text-text-muted text-center px-4 italic">
                Luego podrás configurar un logo para tu negocio.
              </p>

              <button
                (click)="nextStep()"
                class="btn-primary w-full h-14"
                [disabled]="!businessName()"
              >
                Empezar →
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Category Selection -->
        <div
          class="step-container"
          [class.step-active]="currentStep() === 2"
          [class.step-inactive]="currentStep() !== 2"
        >
          <div class="flex flex-col gap-6">
            <label class="text-sm font-semibold text-text-muted text-center"
              >¿A qué se dedica tu negocio?</label
            >

            <div class="grid grid-cols-2 gap-3">
              @for (cat of categories; track cat.id) {
                <div
                  class="category-card"
                  [class.active]="selectedCategory() === cat.id"
                  (click)="selectedCategory.set(cat.id)"
                >
                  <div class="category-icon">{{ cat.icon }}</div>
                  <span class="text-sm font-medium">{{ cat.name }}</span>
                </div>
              }
            </div>

            <div class="flex gap-3 mt-4">
              <button (click)="prevStep()" class="btn-secondary flex-1">
                Atrás
              </button>
              <button
                (click)="nextStep()"
                class="btn-primary flex-1"
                [disabled]="!selectedCategory()"
              >
                Casi listo →
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Branch & Professional Details -->
        <div
          class="step-container"
          [class.step-active]="currentStep() === 3"
          [class.step-inactive]="currentStep() !== 3"
        >
          <div class="max-w-md mx-auto space-y-8">
            <div class="text-center">
              <p
                class="text-xs font-bold text-primary uppercase tracking-widest mb-2"
              >
                Paso 3 de 5
              </p>
              <h3 class="text-2xl font-black">Donde sucede la magia</h3>
              <p class="text-sm text-text-muted leading-relaxed">
                Configurá tu local para que tus clientes sepan
                <b>exactamente cómo llegar</b> y conocé a tu primer profesional.
              </p>
            </div>

            <div class="space-y-4">
              <!-- Sede -->
              <div
                class="p-4 rounded-3xl bg-surface-subtle border border-border space-y-4"
              >
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"
                >
                  <app-icon name="store" class="text-xs"></app-icon> Tu Primera
                  Sede
                </label>
                <div class="space-y-3">
                  <input
                    type="text"
                    [ngModel]="branchName()"
                    (ngModelChange)="branchName.set($event)"
                    placeholder="Nombre de la Sede"
                    class="input-field"
                  />
                  <input
                    type="text"
                    [ngModel]="branchAddress()"
                    (ngModelChange)="branchAddress.set($event)"
                    placeholder="Dirección"
                    class="input-field"
                  />
                  <p class="text-[9px] text-text-muted px-2 italic">
                    Esto aparecerá en el ticket de reserva de tus clientes.
                  </p>
                </div>
              </div>

              <!-- Profesional -->
              <div
                class="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-4"
              >
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"
                >
                  <app-icon name="person" class="text-xs"></app-icon> Tu Perfil
                  Profesional
                </label>
                <div class="space-y-3">
                  <div class="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      [ngModel]="professionalFirstName()"
                      (ngModelChange)="professionalFirstName.set($event)"
                      placeholder="Nombre"
                      class="input-field"
                    />
                    <input
                      type="text"
                      [ngModel]="professionalLastName()"
                      (ngModelChange)="professionalLastName.set($event)"
                      placeholder="Apellido"
                      class="input-field"
                    />
                  </div>
                  <p class="text-[9px] text-text-muted px-2 italic">
                    Como dueño, configuramos tu primer perfil para que puedas
                    recibir turnos hoy mismo.
                  </p>
                </div>
              </div>

              <!-- Horarios -->
              <div
                class="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-4"
              >
                <label
                  class="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"
                >
                  <app-icon name="schedule" class="text-xs"></app-icon> Horarios
                  de Atención
                </label>

                <div class="flex justify-between gap-1">
                  @for (day of days; track day.id) {
                    <button
                      type="button"
                      (click)="toggleDay(day.id)"
                      [class.bg-primary]="workingDays().includes(day.id)"
                      [class.text-white]="workingDays().includes(day.id)"
                      [class.bg-white/5]="!workingDays().includes(day.id)"
                      [class.text-text-muted]="!workingDays().includes(day.id)"
                      [class.border-primary/50]="workingDays().includes(day.id)"
                      class="w-9 h-9 rounded-xl text-xs font-bold transition-all border border-border"
                    >
                      {{ day.label }}
                    </button>
                  }
                </div>

                <div class="grid grid-cols-2 gap-3 mt-2">
                  <div class="space-y-1">
                    <app-time-input
                      [ngModel]="startTime()"
                      (ngModelChange)="startTime.set($event)"
                      label="Desde"
                    ></app-time-input>
                  </div>
                  <div class="space-y-1">
                    <app-time-input
                      [ngModel]="endTime()"
                      (ngModelChange)="endTime.set($event)"
                      label="Hasta"
                    ></app-time-input>
                  </div>
                </div>
                <p class="text-[9px] text-text-muted px-2 italic text-center">
                  Configuración rápida. Podrás definir horarios cortados más
                  tarde.
                </p>
              </div>
            </div>

            <div class="flex gap-3 pt-4">
              <button (click)="prevStep()" class="btn-secondary flex-1">
                Atrás
              </button>
              <button
                (click)="nextStep()"
                class="btn-primary flex-1"
                [disabled]="!professionalFirstName() || !professionalLastName()"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>

        <!-- Step 4: Services Configuration -->
        <div
          class="step-container"
          [class.step-active]="currentStep() === 4"
          [class.step-inactive]="currentStep() !== 4"
        >
          <div class="max-w-xl mx-auto space-y-8">
            <div class="text-center">
              <p
                class="text-xs font-bold text-primary uppercase tracking-widest mb-2"
              >
                Paso 4 de 5
              </p>
              <h3 class="text-2xl font-black">Configuración Final</h3>
              <p class="text-sm text-text-muted">
                ¿Cómo quieres empezar con tus servicios?
              </p>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <!-- Intelligent Load -->
              <div
                class="check-card p-6 !flex-col md:!flex-row gap-6 items-center relative overflow-hidden"
                [class.active-card]="loadDefaultServices()"
                (click)="loadDefaultServices.set(true)"
              >
                <div
                  class="absolute top-0 right-0 px-3 py-1 bg-primary text-[8px] font-black uppercase tracking-tighter rounded-bl-xl text-white"
                >
                  Recomendado
                </div>

                <div
                  class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner"
                >
                  <app-icon name="magic_button" class="text-2xl"></app-icon>
                </div>
                <div class="flex-1 text-center md:text-left">
                  <p class="text-lg font-black">Carga Inteligente</p>
                  <p class="text-xs text-text-muted">
                    Inicia con servicios sugeridos para
                    {{ selectedCategory() || 'tu rubro' }}
                  </p>

                  <!-- Service Preview (Only visible when active) -->
                  @if (loadDefaultServices()) {
                    <div
                      class="mt-4 flex flex-wrap gap-2 justify-center md:justify-start animate-fade-in"
                    >
                      @for (service of categoryServices(); track service) {
                        <span
                          class="px-2 py-1 rounded-md bg-primary/5 border border-primary/10 text-[9px] font-bold text-primary"
                          >+ {{ service }}</span
                        >
                      }
                    </div>
                  }
                </div>
                <div
                  class="custom-check shrink-0"
                  [class.checked]="loadDefaultServices()"
                ></div>
              </div>

              <!-- Manual Load -->
              <div
                class="check-card p-6 !flex-col md:!flex-row gap-6 items-center"
                [class.active-card]="!loadDefaultServices()"
                (click)="loadDefaultServices.set(false)"
              >
                <div
                  class="w-14 h-14 rounded-2xl bg-surface-subtle text-text-main flex items-center justify-center"
                >
                  <app-icon name="edit_note" class="text-2xl"></app-icon>
                </div>
                <div class="flex-1 text-center md:text-left">
                  <p class="text-lg font-black">Carga Manual</p>
                  <p class="text-xs text-text-muted">
                    Configura tus propios servicios desde cero
                  </p>
                </div>
                <div
                  class="custom-check shrink-0"
                  [class.checked]="!loadDefaultServices()"
                ></div>
              </div>
            </div>

            <!-- Action Bar -->
            <div class="flex flex-col md:flex-row gap-3 pt-6">
              <button
                (click)="prevStep()"
                class="btn-secondary flex-1"
                [disabled]="isLoading"
              >
                Atrás
              </button>
              <button
                (click)="completeOnboarding()"
                class="btn-primary flex-[2] relative overflow-hidden"
                [disabled]="isLoading"
              >
                @if (isLoading) {
                  <div class="flex items-center gap-2">
                    <span
                      class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"
                    ></span>
                    <span>Configurando entorno...</span>
                  </div>
                } @else {
                  <span>Finalizar Configuración</span>
                }
              </button>
            </div>
          </div>
        </div>

        <!-- Step 5: Success & Summary -->
        <div
          class="step-container"
          [class.step-active]="currentStep() === 5"
          [class.step-inactive]="currentStep() !== 5"
        >
          <div class="max-w-md mx-auto text-center space-y-8 animate-fade-in">
            <div class="relative inline-block">
              <div
                class="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse"
              ></div>
              <div
                class="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center mx-auto shadow-2xl"
              >
                <app-icon
                  name="celebration"
                  class="text-4xl text-white"
                ></app-icon>
              </div>
            </div>

            <div class="space-y-2">
              <h3 class="text-3xl font-black">¡Todo listo!</h3>
              <p class="text-text-muted">
                Hemos configurado Axenda para
                <b>{{ businessName() || 'tu negocio' }}</b
                >.
              </p>
            </div>

            <!-- Plan Summary Card -->
            <div
              class="p-6 rounded-[2.5rem] bg-surface-subtle border border-border text-left relative overflow-hidden shadow-2xl"
            >
              <div
                class="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full"
              ></div>

              <div class="flex items-center gap-4 mb-6">
                <div
                  class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner"
                >
                  <app-icon
                    name="stars"
                    class="text-primary text-xl"
                  ></app-icon>
                </div>
                <div>
                  <p
                    class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                  >
                    Tu Suscripción
                  </p>
                  <h4 class="text-xl font-black">Plan Pro</h4>
                </div>
              </div>

              <div class="space-y-3 mb-6">
                <div class="flex items-center gap-3 text-sm text-text-muted">
                  <app-icon
                    name="check_circle"
                    class="text-emerald-400 text-lg"
                  ></app-icon>
                  <span
                    >Entorno para {{ selectedCategory() || 'tu rubro' }}</span
                  >
                </div>
                <div class="flex items-center gap-3 text-sm text-text-muted">
                  <app-icon
                    name="check_circle"
                    class="text-emerald-400 text-lg"
                  ></app-icon>
                  <span>{{
                    loadDefaultServices()
                      ? 'Servicios inteligentes cargados'
                      : 'Configuración manual habilitada'
                  }}</span>
                </div>
              </div>

              <div
                class="p-4 rounded-2xl bg-primary/10 border border-primary/20"
              >
                <div class="flex gap-3">
                  <app-icon name="info" class="text-primary"></app-icon>
                  <div>
                    <p
                      class="text-[10px] font-black text-primary uppercase tracking-wider mb-1"
                    >
                      Periodo de Prueba Activo
                    </p>
                    <p class="text-xs leading-relaxed">
                      Disfrutás de <b>14 días gratis</b> para explorar todas las
                      funciones. No se requiere tarjeta hoy.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              (click)="finishOnboarding()"
              class="btn-primary w-full h-16 text-lg font-black tracking-wide shadow-lg shadow-primary/20"
            >
              Empezar a usar Axenda →
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @reference "../../../styles.css";

      .range-slider {
        @apply w-full h-1.5 bg-surface-subtle-hover rounded-full appearance-none cursor-pointer accent-primary transition-all;
      }

      .range-slider::-webkit-slider-thumb {
        @apply appearance-none w-6 h-6 rounded-full bg-white shadow-lg shadow-primary/40 cursor-pointer border-2 border-primary transition-transform hover:scale-110 active:scale-90;
      }

      .slider-group {
        @apply p-4 rounded-2xl bg-surface-subtle border border-border transition-all hover:bg-surface-subtle-hover;
      }

      .check-card {
        @apply p-4 rounded-2xl bg-surface-subtle border border-border cursor-pointer transition-all duration-300
         hover:bg-surface-subtle-hover hover:border-primary/20 flex flex-col;
      }

      .active-card {
        @apply bg-primary-glow border-primary/30;
      }

      .custom-check {
        @apply w-5 h-5 rounded-full border-2 border-border relative transition-all duration-300;
      }

      .custom-check.checked {
        @apply border-primary bg-primary;
      }

      .custom-check.checked::after {
        content: '✓';
        @apply absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold;
      }

      .mini-chip {
        @apply flex-1 py-3 px-2 rounded-xl bg-surface-subtle border border-border text-xs font-semibold
         text-text-muted transition-all hover:bg-surface-subtle-hover;
      }

      .active-mini {
        @apply bg-primary-glow border-primary text-primary;
      }

      .step-container {
        @apply transition-all duration-500 ease-in-out;
      }

      .step-active {
        @apply opacity-100 translate-x-0;
      }

      .step-inactive {
        @apply opacity-0 translate-x-10 pointer-events-none absolute;
      }

      .category-card {
        @apply p-4 rounded-2xl border border-border bg-surface-subtle hover:bg-primary-glow hover:border-primary/30 transition-all cursor-pointer flex flex-col items-center gap-3 text-center;
      }

      .category-card.active {
        @apply bg-primary-glow border-primary shadow-[0_0_20px_rgba(99,102,241,0.1)];
      }

      .category-icon {
        @apply w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl;
      }

      .progress-bar {
        @apply h-1.5 bg-surface-subtle-hover rounded-full overflow-hidden mb-8;
      }

      .progress-fill {
        @apply h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out;
      }
    `,
  ],
})
export class GettingStartedComponent implements OnInit {
  private tenantsService = inject(TenantsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);

  businessName = signal<string>('');
  logoUrl = signal<string | null>(null);
  tenantId = signal<string>('');
  currentStep = signal(1);
  selectedCategory = signal<string | null>(null);
  isLoading = false;

  // New Step: Branch & Professional Info
  branchName = signal<string>('');
  branchAddress = signal<string>('');
  professionalFirstName = signal<string>('');
  professionalLastName = signal<string>('');

  // Schedule Signals
  workingDays = signal<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  startTime = signal<string>('09:00');
  endTime = signal<string>('18:00');

  // Service Selection Signal
  loadDefaultServices = signal<boolean>(true);

  // Example services based on category
  categoryServices = computed(() => {
    const category = this.selectedCategory();
    if (!category) return [];

    const defaults: Record<string, string[]> = {
      barbershop: ['Corte de Cabello', 'Barba & Perfilado', 'Coloración'],
      medical: ['Consulta Médica', 'Control / Seguimiento', 'Estudio Médico'],
      beauty: ['Limpieza Facial', 'Manicuría / Pedicuría', 'Depilación'],
      fitness: ['Clase Personalizada', 'Evaluación Física', 'Yoga / Pilates'],
      legal: ['Asesoría Legal', 'Revisión de Contratos', 'Mediación'],
      generic: ['Servicio Estándar', 'Consulta General'],
    };

    return defaults[category.toLowerCase()] || [];
  });

  finishOnboarding() {
    console.log('Redirecting to dashboard...');
    window.location.href = '/dashboard'; // O el path que corresponda
  }

  categories = [
    { id: 'barbershop', name: 'Barbería / Peluquería', icon: '✂️' },
    { id: 'medical', name: 'Salud / Consultorio', icon: '🩺' },
    { id: 'beauty', name: 'Estética / Spa', icon: '✨' },
    { id: 'fitness', name: 'Fitness / Yoga', icon: '🧘' },
    { id: 'legal', name: 'Legal / Contable', icon: '⚖️' },
    { id: 'generic', name: 'Otro Servicio', icon: '🏢' },
  ];

  ngOnInit() {
    this.tenantsService.getMe().subscribe({
      next: (tenant) => {
        this.tenantId.set(tenant.id);
        this.businessName.set(tenant.name);
        this.logoUrl.set(tenant.logoUrl || null);
        if (tenant.onboardingCompleted) {
          this.router.navigate(['/dashboard']);
        }
      },
    });

    this.http.get<any>(`${environment.apiUrl}/users/me`).subscribe({
      next: (user) => {
        if (user) {
          this.professionalFirstName.set(user.firstName || '');
          this.professionalLastName.set(user.lastName || '');
        }
      },
      error: (err) =>
        console.error(
          'Error al cargar datos del usuario para el onboarding:',
          err,
        ),
    });
  }

  nextStep() {
    if (this.currentStep() < 5) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  async completeOnboarding() {
    this.isLoading = true;

    const onboardingData = {
      name: this.businessName(),
      logoUrl: this.logoUrl() || undefined,
      mode: this.selectedCategory()?.toUpperCase() || 'GENERIC',
      onboardingCompleted: true,
      branchName: this.branchName() || this.businessName(),
      branchAddress: this.branchAddress(),
      professionalFirstName: this.professionalFirstName(),
      professionalLastName: this.professionalLastName(),
      availability: this.workingDays().map((day) => ({
        dayOfWeek: day,
        startTime: this.startTime(),
        endTime: this.endTime(),
      })),
      // Metadata for setup logic in backend (static defaults to satisfy backend DTO validation)
      metadata: {
        plan: 'Pro',
        loadDefaults: this.loadDefaultServices(),
        setup: {
          volume: 100,
          teamSize: 5,
          whatsapp: false,
          payments: false,
        },
      },
    };

    this.tenantsService.completeOnboarding(onboardingData).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep.set(5);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error completing onboarding', err);
      },
    });
  }

  onLogoUploaded(fileKey: string) {
    this.logoUrl.set(fileKey);
  }

  days = [
    { id: 1, label: 'L' },
    { id: 2, label: 'M' },
    { id: 3, label: 'M' },
    { id: 4, label: 'J' },
    { id: 5, label: 'V' },
    { id: 6, label: 'S' },
    { id: 0, label: 'D' },
  ];

  toggleDay(dayId: number) {
    const current = this.workingDays();
    if (current.includes(dayId)) {
      this.workingDays.set(current.filter((d) => d !== dayId));
    } else {
      this.workingDays.set([...current, dayId].sort((a, b) => a - b));
    }
  }
}
