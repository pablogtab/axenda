import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  catchError,
  tap,
} from 'rxjs';
import { SelectConfig } from '../../../shared/components/select/select';

import { ProfessionalsListComponent } from '../professionals/professionals-list/professionals-list.component';
import { BranchesListComponent } from '../branches/branches-list/branches-list.component';
import { ServicesListComponent } from '../services/services-list/services-list.component';
import { TenantsService } from '../../../core/services/tenants.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

// Sub-components
import { SettingsGeneralComponent } from './components/settings-general/settings-general.component';
import { SettingsAppearanceComponent } from './components/settings-appearance/settings-appearance.component';
import { SettingsBookingComponent } from './components/settings-booking/settings-booking.component';
import { SettingsNotificationsComponent } from './components/settings-notifications/settings-notifications.component';
import { SettingsBillingComponent } from './components/settings-billing/settings-billing.component';
import { SettingsWhatsappComponent } from './components/settings-whatsapp/settings-whatsapp.component';
import { SettingsCustomFieldsComponent } from './components/settings-custom-fields/settings-custom-fields.component';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { QrDialogComponent } from '../../../shared/components/qr-dialog/qr-dialog.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ProfessionalsListComponent,
    BranchesListComponent,
    ServicesListComponent,
    SettingsGeneralComponent,
    SettingsAppearanceComponent,
    SettingsBookingComponent,
    SettingsNotificationsComponent,
    SettingsBillingComponent,
    SettingsWhatsappComponent,
    SettingsCustomFieldsComponent,
    ThemeToggleComponent,
    QrDialogComponent,
    IconComponent,
  ],
  template: `
    <div class="h-full flex flex-col p-2 md:p-4 overflow-hidden bg-bg-primary">
      <div class="mb-4 flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-bold text-text-main tracking-tight">
            Configuración del Negocio
          </h1>
          <p class="text-text-muted text-sm mt-1">
            Gestiona los detalles y preferencias de tu negocio.
          </p>
        </div>
        <app-theme-toggle [showLabels]="true" />
      </div>

      <div class="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
        <!-- Section Sidebar / Menu -->
        <aside
          class="w-full md:w-64 shrink-0 grid grid-cols-4 md:flex md:flex-col gap-2 md:gap-1 overflow-y-auto custom-scrollbar md:pr-2 pb-2 md:pb-0"
        >
          <button
            *ngFor="let section of sections"
            (click)="setActiveSection(section.id)"
            [class.bg-surface-subtle-hover]="activeSection === section.id"
            [class.text-text-main]="activeSection === section.id"
            [class.border-b-4]="activeSection === section.id"
            [class.md:border-b-0]="activeSection === section.id"
            [class.md:border-l-4]="activeSection === section.id"
            [class.border-primary]="activeSection === section.id"
            class="flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:p-3 rounded-xl text-text-muted font-medium transition-all hover:bg-surface-subtle hover:text-text-main text-center md:text-left group border-b-4 md:border-b-0 md:border-l-4 border-transparent shrink-0"
          >
            <div
              class="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0"
            >
              <app-icon
                *ngIf="section.id !== 'whatsapp'"
                name="{{ section.icon }}"
                class="text-base md:text-base"
              ></app-icon>
              <svg
                *ngIf="section.id === 'whatsapp'"
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.455h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                />
              </svg>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-bold truncate text-[10px] md:text-sm">{{
                section.title
              }}</span>
              <span class="text-[10px] opacity-60 truncate hidden md:block">{{
                section.description
              }}</span>
            </div>
          </button>
        </aside>

        <!-- Content Area -->
        <main
          class="flex-1 glass rounded-2xl overflow-hidden flex flex-col border border-border"
        >
          <div
            class="h-full custom-scrollbar"
            [class.overflow-y-auto]="activeSection !== 'public-site'"
            [class.overflow-hidden]="activeSection === 'public-site'"
            [class.flex]="activeSection === 'public-site'"
            [class.flex-col]="activeSection === 'public-site'"
            [class.p-4]="
              !['professionals', 'branches', 'services'].includes(activeSection)
            "
            [class.md:p-6]="
              !['professionals', 'branches', 'services'].includes(activeSection)
            "
            [class.p-0]="
              ['professionals', 'branches', 'services'].includes(activeSection)
            "
          >
            <!-- Portal de Reservas / Sitio Público -->
            <div
              *ngIf="activeSection === 'public-site'"
              class="h-full flex flex-col animate-in fade-in duration-500"
            >
              <!-- Sub-tabs navigation -->
              <div
                class="flex border-b border-border pb-px gap-6 shrink-0 overflow-x-auto custom-scrollbar"
              >
                <button
                  (click)="setActivePublicSubTab('general')"
                  [class.text-primary]="activePublicSubTab === 'general'"
                  [class.border-primary]="activePublicSubTab === 'general'"
                  class="pb-3 text-sm font-bold text-text-muted border-b-2 border-transparent transition-all hover:text-text-main flex items-center gap-2 whitespace-nowrap"
                >
                  <app-icon name="store" class="text-sm"></app-icon>
                  <span class="md:hidden">Información</span>
                  <span class="hidden md:inline">Información General</span>
                </button>
                <button
                  (click)="setActivePublicSubTab('appearance')"
                  [class.text-primary]="activePublicSubTab === 'appearance'"
                  [class.border-primary]="activePublicSubTab === 'appearance'"
                  class="pb-3 text-sm font-bold text-text-muted border-b-2 border-transparent transition-all hover:text-text-main flex items-center gap-2 whitespace-nowrap"
                >
                  <app-icon name="palette" class="text-sm"></app-icon>
                  <span class="md:hidden">Apariencia</span>
                  <span class="hidden md:inline">Apariencia y Colores</span>
                </button>
                <button
                  (click)="setActivePublicSubTab('booking')"
                  [class.text-primary]="activePublicSubTab === 'booking'"
                  [class.border-primary]="activePublicSubTab === 'booking'"
                  class="pb-3 text-sm font-bold text-text-muted border-b-2 border-transparent transition-all hover:text-text-main flex items-center gap-2 whitespace-nowrap"
                >
                  <app-icon name="calendar_month" class="text-sm"></app-icon>
                  <span class="md:hidden">Reglas</span>
                  <span class="hidden md:inline">Reglas de Reserva</span>
                </button>
              </div>

              <!-- Sub-tab contents -->
              <div class="flex-1 overflow-y-auto custom-scrollbar pt-6">
                <!-- General Info -->
                <app-settings-general
                  *ngIf="activePublicSubTab === 'general'"
                  [form]="settingsForm"
                  [tenantId]="tenantId()"
                  [slugStatus]="slugStatus()"
                  [categoryConfig]="categoryConfig"
                  [categories]="categories"
                  (copyLink)="copyToClipboard()"
                  (visitPage)="visitPublicPage()"
                  (generateQR)="generateQR()"
                >
                </app-settings-general>

                <!-- Appearance -->
                <app-settings-appearance
                  *ngIf="activePublicSubTab === 'appearance'"
                  [form]="settingsForm"
                  [colorPresets]="colorPresets"
                  [activeTheme]="activeTheme()"
                  [showThemeSelector]="showThemeSelector()"
                  (applyPreset)="applyPreset($event)"
                  (toggleThemeSelector)="
                    showThemeSelector.set(!showThemeSelector())
                  "
                  (closeThemeSelector)="showThemeSelector.set(false)"
                >
                </app-settings-appearance>

                <!-- Booking Rules -->
                <app-settings-booking
                  *ngIf="activePublicSubTab === 'booking'"
                  [form]="settingsForm"
                  [anticipationMinConfig]="anticipationMinConfig"
                  [anticipationMinOptions]="anticipationMinOptions"
                  [anticipationMaxConfig]="anticipationMaxConfig"
                  [anticipationMaxOptions]="anticipationMaxOptions"
                  [overlapConfig]="overlapConfig"
                  [overlapOptions]="overlapOptions"
                  [cancellationConfig]="cancellationConfig"
                  [cancellationOptions]="cancellationOptions"
                >
                </app-settings-booking>
              </div>
            </div>

            <!-- Notifications Section -->
            <app-settings-notifications
              *ngIf="activeSection === 'notifications'"
              [form]="settingsForm"
            >
            </app-settings-notifications>

            <!-- Professionals Section -->
            <div
              *ngIf="activeSection === 'professionals'"
              class="animate-in fade-in duration-500"
            >
              <app-professionals-list></app-professionals-list>
            </div>

            <!-- Branches Section -->
            <div
              *ngIf="activeSection === 'branches'"
              class="animate-in fade-in duration-500"
            >
              <app-branches-list></app-branches-list>
            </div>

            <!-- Services Section -->
            <div
              *ngIf="activeSection === 'services'"
              class="animate-in fade-in duration-500"
            >
              <app-services-list></app-services-list>
            </div>

            <!-- Custom Fields Section -->
            <div
              *ngIf="activeSection === 'custom-fields'"
              class="animate-in fade-in duration-500"
            >
              <app-settings-custom-fields></app-settings-custom-fields>
            </div>

            <!-- Billing Section -->
            <app-settings-billing *ngIf="activeSection === 'billing'">
            </app-settings-billing>

            <!-- WhatsApp Section -->
            <app-settings-whatsapp *ngIf="activeSection === 'whatsapp'">
            </app-settings-whatsapp>
          </div>
        </main>
      </div>

      <!-- QR Modal Reutilizable -->
      <app-qr-dialog
        *ngIf="showQRModal()"
        [url]="'https://axenda.ar/' + settingsForm.get('publicSlug')?.value"
        (close)="showQRModal.set(false)"
      >
      </app-qr-dialog>
    </div>
  `,
  styles: [
    `
      /* Custom scrollbar for the settings sections */
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }

      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Transitions and Animations */
      .animate-in {
        animation-duration: 0.5s;
        animation-fill-mode: both;
      }

      @keyframes fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slide-in-from-bottom {
        from {
          transform: translateY(1rem);
        }
        to {
          transform: translateY(0);
        }
      }

      .fade-in {
        animation-name: fade-in;
      }

      .slide-in-from-bottom-4 {
        animation-name: slide-in-from-bottom;
      }

      /* Premium Glass Effect overrides if needed */
      .glass {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
    `,
  ],
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;
  private route = inject(ActivatedRoute);

  sections = [
    {
      id: 'public-site',
      title: 'Sitio Público',
      icon: 'language',
      description: 'Portal de reservas, marca y reglas',
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      icon: 'notifications',
      description: 'Mensajes automáticos y recordatorios',
    },
    {
      id: 'professionals',
      title: 'Profesionales',
      icon: 'group',
      description: 'Gestiona tu equipo de trabajo',
    },
    {
      id: 'branches',
      title: 'Sucursales',
      icon: 'location_on',
      description: 'Ubicaciones de tu negocio',
    },
    {
      id: 'services',
      title: 'Servicios',
      icon: 'content_cut',
      description: 'Catálogo de servicios y precios',
    },
    {
      id: 'custom-fields',
      title: 'Clientes',
      icon: 'contacts',
      description: 'Campos personalizados para el CRM',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      icon: 'chat',
      description: 'Automatiza tus recordatorios',
    },
    {
      id: 'billing',
      title: 'Cuenta y Plan',
      icon: 'credit_card',
      description: 'Gestiona tu suscripción y pagos',
    },
  ];

  activeSection = 'public-site';
  activePublicSubTab = 'general';

  colorPresets = [
    {
      name: 'Axenda Night',
      dark: true,
      colors: {
        primary: '#6366f1',
        hover: '#4f46e5',
        accent: '#a855f7',
        bg: '#0a0b14',
        text: '#f8fafc',
      },
    },
    {
      name: 'Midnight Gold',
      dark: true,
      colors: {
        primary: '#f59e0b',
        hover: '#d97706',
        accent: '#fbbf24',
        bg: '#0f172a',
        text: '#f8fafc',
      },
    },
    {
      name: 'Neon Cyber',
      dark: true,
      colors: {
        primary: '#06b6d4',
        hover: '#0891b2',
        accent: '#ec4899',
        bg: '#020617',
        text: '#f8fafc',
      },
    },
    {
      name: 'Forest Dark',
      dark: true,
      colors: {
        primary: '#10b981',
        hover: '#059669',
        accent: '#34d399',
        bg: '#064e3b',
        text: '#f1f5f9',
      },
    },
    {
      name: 'Clean White',
      dark: false,
      colors: {
        primary: '#2563eb',
        hover: '#1d4ed8',
        accent: '#60a5fa',
        bg: '#ffffff',
        text: '#0f172a',
      },
    },
    {
      name: 'Minimal Rose',
      dark: false,
      colors: {
        primary: '#e11d48',
        hover: '#be123c',
        accent: '#fb7185',
        bg: '#fff1f2',
        text: '#4c0519',
      },
    },
    {
      name: 'Coffee Shop',
      dark: false,
      colors: {
        primary: '#92400e',
        hover: '#78350f',
        accent: '#d97706',
        bg: '#fef3c7',
        text: '#451a03',
      },
    },
    {
      name: 'Ocean Light',
      dark: false,
      colors: {
        primary: '#0891b2',
        hover: '#0e7490',
        accent: '#22d3ee',
        bg: '#ecfeff',
        text: '#164e63',
      },
    },
  ];

  // Configs for Selects
  categoryConfig: SelectConfig = {
    label: 'Categoría',
    placeholder: 'Seleccionar rubro...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value,
  };

  anticipationMinConfig: SelectConfig = {
    label: 'Tiempo mínimo',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value,
  };

  anticipationMaxConfig: SelectConfig = {
    label: 'Tiempo máximo',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value,
  };

  cancellationConfig: SelectConfig = {
    label: 'Límite para cancelar / reprogramar',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value,
  };

  overlapConfig: SelectConfig = {
    label: 'Solapamiento de turnos',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value,
  };

  // Options
  categories = [
    { label: 'Belleza y Estética', value: 'beauty' },
    { label: 'Salud', value: 'health' },
    { label: 'Deporte', value: 'fitness' },
    { label: 'Otro', value: 'other' },
  ];

  anticipationMinOptions = [
    { label: '15 minutos antes', value: '15m' },
    { label: '30 minutos antes', value: '30m' },
    { label: '1 hora antes', value: '1h' },
    { label: '2 horas antes', value: '2h' },
    { label: '12 horas antes', value: '12h' },
    { label: '24 horas antes', value: '24h' },
  ];

  anticipationMaxOptions = [
    { label: '1 semana', value: 7 },
    { label: '1 mes', value: 30 },
    { label: '2 meses', value: 60 },
    { label: '6 meses', value: 180 },
  ];

  cancellationOptions = [
    { label: '1 hora antes', value: '1h' },
    { label: '6 horas antes', value: '6h' },
    { label: '12 horas antes', value: '12h' },
    { label: '24 horas antes', value: '24h' },
    {
      label: 'No permitir cancelación / reprogramación online',
      value: 'never',
    },
  ];

  overlapOptions = [
    { label: 'Sin solapamiento', value: 0 },
    { label: '5 minutos', value: 5 },
    { label: '10 minutos', value: 10 },
    { label: '15 minutos', value: 15 },
    { label: '20 minutos', value: 20 },
    { label: '30 minutos', value: 30 },
  ];

  activeTheme = signal<any>(null);
  showThemeSelector = signal(false);

  private tenantsService = inject(TenantsService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  slugStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    'idle',
  );
  originalSlug = signal<string>('');
  tenantId = signal<string>('');
  showQRModal = signal(false);

  constructor(private fb: FormBuilder) {
    this.settingsForm = this.fb.group({
      name: [''],
      category: ['beauty'],
      phone: [''],
      email: [''],
      address: [''],
      publicSlug: ['', { updateOn: 'change' }],
      publicMinBookingTime: ['1h'],
      publicMaxBookingDays: [30],
      cancellationLimit: ['24h'],
      allowReschedule: [true],
      confirmEmail: [true],
      whatsappReminder: [false],
      whatsappCancellation: [true],
      logoUrl: [null],
      bannerUrl: [null],
      primaryColor: ['#6366f1'],
      primaryHoverColor: ['#4f46e5'],
      accentColor: ['#a855f7'],
      backgroundColor: ['#0a0b14'],
      textColor: ['#f8fafc'],
      publicShowBranchSelection: [true],
      publicShowProfessionalSelection: [true],
      publicMaxOverlapMins: [15],
      publicActive: [true],
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['section']) {
        const legacyMap: Record<string, string> = {
          'business-info': 'general',
          appearance: 'appearance',
          booking: 'booking',
          'booking-settings': 'booking',
        };

        const mappedSubTab = legacyMap[params['section']];
        if (mappedSubTab) {
          this.activeSection = 'public-site';
          this.activePublicSubTab = mappedSubTab;
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { section: 'public-site', subtab: mappedSubTab },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        } else {
          this.activeSection = params['section'];
          if (this.activeSection === 'public-site') {
            this.activePublicSubTab = params['subtab'] || 'general';
          }
        }
        this.cdr.detectChanges();
      }
    });
    this.loadTenantData();
    this.setupSlugValidation();
    this.setupFormLogic();
  }

  private setupFormLogic() {
    this.settingsForm.valueChanges.subscribe((values) => {
      const theme = this.colorPresets.find(
        (p) =>
          p.colors.primary === values.primaryColor &&
          p.colors.hover === values.primaryHoverColor &&
          p.colors.accent === values.accentColor &&
          p.colors.bg === values.backgroundColor &&
          p.colors.text === values.textColor,
      );
      this.activeTheme.set(theme || null);
    });

    this.settingsForm.valueChanges
      .pipe(
        debounceTime(1000),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      )
      .subscribe(() => {
        this.save(true);
      });
  }

  private setupSlugValidation() {
    const control = this.settingsForm.get('publicSlug');
    if (!control) return;

    control.valueChanges
      .pipe(
        tap((slug) => {
          // Normalize slug: lowercase, replace spaces with hyphens, remove special characters
          if (slug) {
            const normalized = slug
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '')
              .replace(/-+/g, '-');

            if (normalized !== slug) {
              control.setValue(normalized, { emitEvent: false });
              slug = normalized;
            }
          }

          if (slug === this.originalSlug()) {
            this.slugStatus.set('idle');
          } else if (slug && slug.length > 0) {
            this.slugStatus.set('checking');
          } else {
            this.slugStatus.set('idle');
          }
          this.cdr.detectChanges();
        }),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((slug) => {
          if (!slug || slug === this.originalSlug()) {
            return of({ available: true, skip: true });
          }

          const slugRegex = /^[a-z0-9-]+$/;
          if (!slugRegex.test(slug)) {
            this.slugStatus.set('invalid');
            this.cdr.detectChanges();
            return of({ available: false, skip: true });
          }

          return this.tenantsService.checkSlugAvailability(slug).pipe(
            catchError(() => {
              this.slugStatus.set('idle');
              this.cdr.detectChanges();
              return of({ available: false, skip: true });
            }),
          );
        }),
      )
      .subscribe({
        next: (res: any) => {
          if (res.skip) return;
          this.slugStatus.set(res.available ? 'available' : 'taken');
          this.cdr.detectChanges();
        },
        error: () => {
          this.slugStatus.set('idle');
          this.cdr.detectChanges();
        },
      });
  }

  private loadTenantData() {
    this.tenantsService.getMe().subscribe({
      next: (tenant) => {
        this.originalSlug.set(tenant.publicSlug || '');
        this.tenantId.set(tenant.id);
        this.settingsForm.patchValue({
          name: tenant.name,
          publicSlug: tenant.publicSlug || '',
          logoUrl: tenant.logoUrl,
          bannerUrl: tenant.bannerUrl,
          category: tenant.category || 'beauty',
          phone: tenant.phone || '',
          email: tenant.email || '',
          address: tenant.address || '',
          primaryColor: tenant.primaryColor || '#6366f1',
          primaryHoverColor: tenant.primaryHoverColor || '#4f46e5',
          accentColor: tenant.accentColor || '#a855f7',
          backgroundColor: tenant.backgroundColor || '#0a0b14',
          textColor: tenant.textColor || '#f8fafc',
          publicShowBranchSelection: tenant.publicShowBranchSelection ?? true,
          publicShowProfessionalSelection:
            tenant.publicShowProfessionalSelection ?? true,
          publicMaxOverlapMins: tenant.publicMaxOverlapMins ?? 15,
          publicMaxBookingDays: tenant.publicMaxBookingDays ?? 30,
          publicMinBookingTime: tenant.publicMinBookingTime || '1h',
          confirmEmail: tenant.confirmEmail ?? true,
          whatsappReminder: tenant.whatsappReminder ?? false,
          allowReschedule: tenant.allowReschedule ?? true,
          whatsappCancellation: tenant.whatsappCancellation ?? true,
          publicActive: tenant.publicActive ?? true,
          cancellationLimit: tenant.cancellationLimit || '24h',
        });

        const values = this.settingsForm.getRawValue();
        const theme = this.colorPresets.find(
          (p) =>
            p.colors.primary === values.primaryColor &&
            p.colors.hover === values.primaryHoverColor &&
            p.colors.accent === values.accentColor &&
            p.colors.bg === values.backgroundColor &&
            p.colors.text === values.textColor,
        );
        this.activeTheme.set(theme || null);

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackbar.error('Error al cargar la configuración');
      },
    });
  }

  setActiveSection(sectionId: string) {
    this.activeSection = sectionId;

    const queryParams: any = { section: sectionId };
    if (sectionId === 'public-site') {
      queryParams.subtab = this.activePublicSubTab;
    } else {
      queryParams.subtab = null;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  setActivePublicSubTab(subtabId: string) {
    this.activePublicSubTab = subtabId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { subtab: subtabId },
      queryParamsHandling: 'merge',
    });
  }

  save(silent = false) {
    if (
      this.settingsForm.invalid ||
      this.slugStatus() === 'taken' ||
      this.slugStatus() === 'invalid'
    )
      return;

    const values = this.settingsForm.getRawValue();
    this.tenantsService
      .updateMe({
        name: values.name,
        publicSlug: values.publicSlug,
        logoUrl: values.logoUrl,
        bannerUrl: values.bannerUrl,
        category: values.category,
        phone: values.phone,
        email: values.email,
        address: values.address,
        primaryColor: values.primaryColor,
        primaryHoverColor: values.primaryHoverColor,
        accentColor: values.accentColor,
        backgroundColor: values.backgroundColor,
        textColor: values.textColor,
        publicShowBranchSelection: values.publicShowBranchSelection,
        publicShowProfessionalSelection: values.publicShowProfessionalSelection,
        publicMaxOverlapMins: values.publicMaxOverlapMins,
        publicMaxBookingDays: values.publicMaxBookingDays,
        publicMinBookingTime: values.publicMinBookingTime,
        confirmEmail: values.confirmEmail,
        whatsappReminder: values.whatsappReminder,
        allowReschedule: values.allowReschedule,
        whatsappCancellation: values.whatsappCancellation,
        publicActive: values.publicActive,
        cancellationLimit: values.cancellationLimit,
      })
      .subscribe({
        next: () => {
          if (!silent)
            this.snackbar.success('Configuración guardada correctamente');
          this.originalSlug.set(values.publicSlug);
          this.slugStatus.set('idle');
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (!silent) {
            if (err.status === 409) {
              this.snackbar.error(
                'El link público ya está en uso por otro negocio',
              );
            } else {
              this.snackbar.error('Error al guardar la configuración');
            }
          }
        },
      });
  }

  copyToClipboard() {
    const slug = this.settingsForm.get('publicSlug')?.value;
    if (!slug) return;

    const url = `axenda.ar/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.snackbar.success('Link copiado al portapapeles');
    });
  }

  visitPublicPage() {
    const slug = this.settingsForm.get('publicSlug')?.value;
    if (!slug) return;

    const url = `${window.location.origin}/${slug}`;
    window.open(url, '_blank');
  }

  applyPreset(preset: any) {
    this.settingsForm.patchValue({
      primaryColor: preset.colors.primary,
      primaryHoverColor: preset.colors.hover,
      accentColor: preset.colors.accent,
      backgroundColor: preset.colors.bg,
      textColor: preset.colors.text,
    });
    this.snackbar.success(`Plantilla "${preset.name}" aplicada`);
    this.cdr.detectChanges();
  }

  generateQR() {
    this.showQRModal.set(true);
  }
}
