import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError, tap } from 'rxjs';
import { SelectComponent, SelectConfig } from '../../../shared/components/select/select';
import { ImageUploaderComponent } from '../../../shared/components/image-uploader/image-uploader.component';

import { ProfessionalsListComponent } from '../professionals/professionals-list/professionals-list.component';
import { BranchesListComponent } from '../branches/branches-list/branches-list.component';
import { ServicesListComponent } from '../services/services-list/services-list.component';
import { TenantsService } from '../../../core/services/tenants.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { StoragePipe } from '@shared/pipes/storage.pipe';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    SelectComponent,
    ProfessionalsListComponent,
    BranchesListComponent,
    ServicesListComponent,
    ImageUploaderComponent,
    StoragePipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;

  sections = [
    { id: 'business-info', title: 'Información del Negocio', icon: '🏢', description: 'Nombre, contacto y ubicación' },
    { id: 'appearance', title: 'Apariencia', icon: '🎨', description: 'Colores y estilo de tu marca' },
    { id: 'booking-settings', title: 'Configuración de Reservas', icon: '📅', description: 'Antelación, intervalos y cancelaciones' },
    { id: 'notifications', title: 'Notificaciones', icon: '🔔', description: 'Mensajes automáticos y recordatorios' },
    { id: 'professionals', title: 'Profesionales', icon: '👨‍⚕️', description: 'Gestiona tu equipo de trabajo' },
    { id: 'branches', title: 'Sucursales', icon: '📍', description: 'Ubicaciones de tu negocio' },
    { id: 'services', title: 'Servicios', icon: '✂️', description: 'Catálogo de servicios y precios' }
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

  // Options
  categories = [
    { label: 'Belleza y Estética', value: 'beauty' },
    { label: 'Salud', value: 'health' },
    { label: 'Deporte', value: 'fitness' },
    { label: 'Otro', value: 'other' }
  ];

  anticipationMinOptions = [
    { label: '1 hora antes', value: '1h' },
    { label: '2 horas antes', value: '2h' },
    { label: '12 horas antes', value: '12h' },
    { label: '24 horas antes', value: '24h' }
  ];

  anticipationMaxOptions = [
    { label: '1 semana', value: '1w' },
    { label: '1 mes', value: '1m' },
    { label: '2 meses', value: '2m' },
    { label: '6 meses', value: '6m' }
  ];

  cancellationOptions = [
    { label: '1 hora antes', value: '1h' },
    { label: '6 horas antes', value: '6h' },
    { label: '12 horas antes', value: '12h' },
    { label: '24 horas antes', value: '24h' },
    { label: 'No permitir cancelación online', value: 'never' }
  ];

  activeTheme = signal<any>(null);
  showThemeSelector = signal(false);

  private tenantsService = inject(TenantsService);
  private snackbar = inject(SnackbarService);
  private cdr = inject(ChangeDetectorRef);

  slugStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  originalSlug = signal<string>('');
  tenantId = signal<string>('');
  showQRModal = signal(false);
  qrCodeDataUrl = signal<string | null>(null);

  constructor(private fb: FormBuilder) {
    this.settingsForm = this.fb.group({
      name: [''],
      category: ['beauty'],
      phone: [''],
      email: [''],
      address: [''],
      publicSlug: ['', { updateOn: 'change' }],
      anticipationMin: ['1h'],
      anticipationMax: ['1m'],
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
      textColor: ['#f8fafc']
    });
  }

  ngOnInit() {
    this.loadTenantData();
    this.setupSlugValidation();
    this.setupFormLogic();
  }

  private setupFormLogic() {
    // Theme detection - Instant for UI feedback
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

    // Auto-save - Debounced to avoid excessive API calls
    this.settingsForm.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      this.save(true);
    });
  }


  onSlugInput() {
    const slug = this.settingsForm.get('publicSlug')?.value;
    if (slug === this.originalSlug()) {
      this.slugStatus.set('idle');
    } else if (slug && slug.length > 0) {
      this.slugStatus.set('checking');
    } else {
      this.slugStatus.set('idle');
    }
    this.cdr.detectChanges();
  }

  private setupSlugValidation() {
    const control = this.settingsForm.get('publicSlug');
    if (!control) return;

    control.valueChanges.pipe(
      tap(slug => {
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

        // Basic format validation
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
          primaryColor: tenant.primaryColor || '#6366f1',
          primaryHoverColor: tenant.primaryHoverColor || '#4f46e5',
          accentColor: tenant.accentColor || '#a855f7',
          backgroundColor: tenant.backgroundColor || '#0a0b14',
          textColor: tenant.textColor || '#f8fafc'
        });

        // Initial theme detection
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
  }

  save(silent = false) {
    if (this.settingsForm.invalid || this.slugStatus() === 'taken' || this.slugStatus() === 'invalid') return;

    const values = this.settingsForm.getRawValue();
    this.tenantsService.updateMe({
      name: values.name,
      publicSlug: values.publicSlug,
      logoUrl: values.logoUrl,
      bannerUrl: values.bannerUrl,
      primaryColor: values.primaryColor,
      primaryHoverColor: values.primaryHoverColor,
      accentColor: values.accentColor,
      backgroundColor: values.backgroundColor,
      textColor: values.textColor
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

    const url = `axenda.com/${slug}`;
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

  async generateQR() {
    const slug = this.settingsForm.get('publicSlug')?.value;
    if (!slug) return;

    const url = `${window.location.origin}/${slug}`;
    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, url, {
        width: 1000,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const size = canvas.width;
        const logoSize = size * 0.22;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;

        // Draw background for logo (rounded white square)
        ctx.fillStyle = '#ffffff';
        const radius = logoSize * 0.25;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + logoSize - radius, y);
        ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + radius);
        ctx.lineTo(x + logoSize, y + logoSize - radius);
        ctx.quadraticCurveTo(x + logoSize, y + logoSize, x + logoSize - radius, y + logoSize);
        ctx.lineTo(x + radius, y + logoSize);
        ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Load and draw the SVG logo
        const logoImg = new Image();
        logoImg.src = 'assets/logo.svg';
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve; // Continue even if logo fails
        });

        if (logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        } else {
          // Fallback to "A" if logo fails to load
          ctx.fillStyle = '#6366f1';
          ctx.font = `900 ${logoSize * 0.7}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('A', size / 2, size / 2 + (logoSize * 0.05));
        }
      }

      this.qrCodeDataUrl.set(canvas.toDataURL('image/png'));
      this.showQRModal.set(true);
      this.cdr.detectChanges();
    } catch (err) {
      console.error(err);
      this.snackbar.error('Error al generar el código QR');
    }
  }

  downloadQR() {
    const dataUrl = this.qrCodeDataUrl();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-axenda-${this.settingsForm.get('publicSlug')?.value}.png`;
    link.click();
  }
}
