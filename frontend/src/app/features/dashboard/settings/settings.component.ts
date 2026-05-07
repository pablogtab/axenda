import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError, tap } from 'rxjs';
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
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { QrDialogComponent } from '../../../shared/components/qr-dialog/qr-dialog.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule,
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
    ThemeToggleComponent,
    QrDialogComponent, IconComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;
  private route = inject(ActivatedRoute);

  sections = [
    { id: 'business-info', title: 'Tu Negocio', icon: 'store', description: 'Nombre, contacto y ubicación' },
    { id: 'appearance', title: 'Apariencia', icon: 'palette', description: 'Colores y estilo de tu marca' },
    { id: 'booking-settings', title: 'Reservas', icon: 'calendar_month', description: 'Antelación, intervalos y cancelaciones' },
    { id: 'notifications', title: 'Notificaciones', icon: 'notifications', description: 'Mensajes automáticos y recordatorios' },
    { id: 'professionals', title: 'Profesionales', icon: 'group', description: 'Gestiona tu equipo de trabajo' },
    { id: 'branches', title: 'Sucursales', icon: 'location_on', description: 'Ubicaciones de tu negocio' },
    { id: 'services', title: 'Servicios', icon: 'content_cut', description: 'Catálogo de servicios y precios' },
    { id: 'whatsapp', title: 'WhatsApp', icon: 'chat', description: 'Automatiza tus recordatorios' },
    { id: 'billing', title: 'Cuenta y Plan', icon: 'credit_card', description: 'Gestiona tu suscripción y pagos' }
  ];

  activeSection = 'business-info';

  colorPresets = [
    {
      name: 'Axenda Night',
      dark: true,
      colors: { primary: '#6366f1', hover: '#4f46e5', accent: '#a855f7', bg: '#0a0b14', text: '#f8fafc' }
    },
    {
      name: 'Midnight Gold',
      dark: true,
      colors: { primary: '#f59e0b', hover: '#d97706', accent: '#fbbf24', bg: '#0f172a', text: '#f8fafc' }
    },
    {
      name: 'Neon Cyber',
      dark: true,
      colors: { primary: '#06b6d4', hover: '#0891b2', accent: '#ec4899', bg: '#020617', text: '#f8fafc' }
    },
    {
      name: 'Forest Dark',
      dark: true,
      colors: { primary: '#10b981', hover: '#059669', accent: '#34d399', bg: '#064e3b', text: '#f1f5f9' }
    },
    {
      name: 'Clean White',
      dark: false,
      colors: { primary: '#2563eb', hover: '#1d4ed8', accent: '#60a5fa', bg: '#ffffff', text: '#0f172a' }
    },
    {
      name: 'Minimal Rose',
      dark: false,
      colors: { primary: '#e11d48', hover: '#be123c', accent: '#fb7185', bg: '#fff1f2', text: '#4c0519' }
    },
    {
      name: 'Coffee Shop',
      dark: false,
      colors: { primary: '#92400e', hover: '#78350f', accent: '#d97706', bg: '#fef3c7', text: '#451a03' }
    },
    {
      name: 'Ocean Light',
      dark: false,
      colors: { primary: '#0891b2', hover: '#0e7490', accent: '#22d3ee', bg: '#ecfeff', text: '#164e63' }
    }
  ];

  // Configs for Selects
  categoryConfig: SelectConfig = {
    label: 'Categoría',
    placeholder: 'Seleccionar rubro...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  anticipationMinConfig: SelectConfig = {
    label: 'Tiempo mínimo',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  anticipationMaxConfig: SelectConfig = {
    label: 'Tiempo máximo',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  cancellationConfig: SelectConfig = {
    label: 'Límite para cancelar',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  overlapConfig: SelectConfig = {
    label: 'Solapamiento de turnos',
    placeholder: 'Seleccionar...',
    displayFn: (item) => item.label,
    valueFn: (item) => item.value
  };

  // Options
  categories = [
    { label: 'Belleza y Estética', value: 'beauty' },
    { label: 'Salud', value: 'health' },
    { label: 'Deporte', value: 'fitness' },
    { label: 'Otro', value: 'other' }
  ];

  anticipationMinOptions = [
    { label: '15 minutos antes', value: '15m' },
    { label: '30 minutos antes', value: '30m' },
    { label: '1 hora antes', value: '1h' },
    { label: '2 horas antes', value: '2h' },
    { label: '12 horas antes', value: '12h' },
    { label: '24 horas antes', value: '24h' }
  ];

  anticipationMaxOptions = [
    { label: '1 semana', value: 7 },
    { label: '1 mes', value: 30 },
    { label: '2 meses', value: 60 },
    { label: '6 meses', value: 180 }
  ];

  cancellationOptions = [
    { label: '1 hora antes', value: '1h' },
    { label: '6 horas antes', value: '6h' },
    { label: '12 horas antes', value: '12h' },
    { label: '24 horas antes', value: '24h' },
    { label: 'No permitir cancelación online', value: 'never' }
  ];

  overlapOptions = [
    { label: 'Sin solapamiento', value: 0 },
    { label: '5 minutos', value: 5 },
    { label: '10 minutos', value: 10 },
    { label: '15 minutos', value: 15 },
    { label: '20 minutos', value: 20 },
    { label: '30 minutos', value: 30 }
  ];

  activeTheme = signal<any>(null);
  showThemeSelector = signal(false);

  private tenantsService = inject(TenantsService);
  private snackbar = inject(SnackbarService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  slugStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
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
      logoUrl: [null],
      bannerUrl: [null],
      primaryColor: ['#6366f1'],
      primaryHoverColor: ['#4f46e5'],
      accentColor: ['#a855f7'],
      backgroundColor: ['#0a0b14'],
      textColor: ['#f8fafc'],
      publicShowBranchSelection: [true],
      publicShowProfessionalSelection: [true],
      publicMaxOverlapMins: [15]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['section']) {
        this.activeSection = params['section'];
        this.cdr.detectChanges();
      }
    });
    this.loadTenantData();
    this.setupSlugValidation();
    this.setupFormLogic();
  }

  private setupFormLogic() {
    this.settingsForm.valueChanges.subscribe(values => {
      const theme = this.colorPresets.find(p =>
        p.colors.primary === values.primaryColor &&
        p.colors.hover === values.primaryHoverColor &&
        p.colors.accent === values.accentColor &&
        p.colors.bg === values.backgroundColor &&
        p.colors.text === values.textColor
      );
      this.activeTheme.set(theme || null);
    });

    this.settingsForm.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      this.save(true);
    });
  }

  private setupSlugValidation() {
    const control = this.settingsForm.get('publicSlug');
    if (!control) return;

    control.valueChanges.pipe(
      tap(slug => {
        // Normalize slug: lowercase, replace spaces with hyphens, remove special characters
        if (slug) {
          const normalized = slug.toLowerCase()
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
      switchMap(slug => {
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
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (res.skip) return;
        this.slugStatus.set(res.available ? 'available' : 'taken');
        this.cdr.detectChanges();
      },
      error: () => {
        this.slugStatus.set('idle');
        this.cdr.detectChanges();
      }
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
          publicShowProfessionalSelection: tenant.publicShowProfessionalSelection ?? true,
          publicMaxOverlapMins: tenant.publicMaxOverlapMins ?? 15,
          publicMaxBookingDays: tenant.publicMaxBookingDays ?? 30,
          publicMinBookingTime: tenant.publicMinBookingTime || '1h'
        });

        const values = this.settingsForm.getRawValue();
        const theme = this.colorPresets.find(p =>
          p.colors.primary === values.primaryColor &&
          p.colors.hover === values.primaryHoverColor &&
          p.colors.accent === values.accentColor &&
          p.colors.bg === values.backgroundColor &&
          p.colors.text === values.textColor
        );
        this.activeTheme.set(theme || null);

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackbar.error('Error al cargar la configuración');
      }
    });
  }

  setActiveSection(sectionId: string) {
    this.activeSection = sectionId;
    // Actualizar la URL para que sea consistente con la navegación externa
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: sectionId },
      queryParamsHandling: 'merge'
    });
  }

  save(silent = false) {
    if (this.settingsForm.invalid || this.slugStatus() === 'taken' || this.slugStatus() === 'invalid') return;

    const values = this.settingsForm.getRawValue();
    this.tenantsService.updateMe({
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
      publicMinBookingTime: values.publicMinBookingTime
    }).subscribe({
      next: () => {
        if (!silent) this.snackbar.success('Configuración guardada correctamente');
        this.originalSlug.set(values.publicSlug);
        this.slugStatus.set('idle');
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (!silent) {
          if (err.status === 409) {
            this.snackbar.error('El link público ya está en uso por otro negocio');
          } else {
            this.snackbar.error('Error al guardar la configuración');
          }
        }
      }
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
      textColor: preset.colors.text
    });
    this.snackbar.success(`Plantilla "${preset.name}" aplicada`);
    this.cdr.detectChanges();
  }

  generateQR() {
    this.showQRModal.set(true);
  }

}
