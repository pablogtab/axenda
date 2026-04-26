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
    ImageUploaderComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;

  sections = [
    { id: 'business-info', title: 'Información del Negocio', icon: '🏢', description: 'Nombre, contacto y ubicación' },
    { id: 'booking-settings', title: 'Configuración de Reservas', icon: '📅', description: 'Antelación, intervalos y cancelaciones' },
    { id: 'notifications', title: 'Notificaciones', icon: '🔔', description: 'Mensajes automáticos y recordatorios' },
    { id: 'professionals', title: 'Profesionales', icon: '👨‍⚕️', description: 'Gestiona tu equipo de trabajo' },
    { id: 'branches', title: 'Sucursales', icon: '📍', description: 'Ubicaciones de tu negocio' },
    { id: 'services', title: 'Servicios', icon: '✂️', description: 'Catálogo de servicios y precios' }
  ];

  activeSection = 'business-info';

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

  private tenantsService = inject(TenantsService);
  private snackbar = inject(SnackbarService);
  private cdr = inject(ChangeDetectorRef);

  slugStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  originalSlug = signal<string>('');
  tenantId = signal<string>('');

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
      bannerUrl: [null]
    });
  }

  ngOnInit() {
    this.loadTenantData();
    this.setupSlugValidation();
    this.setupAutosave();
  }

  private setupAutosave() {
    this.settingsForm.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
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
          bannerUrl: tenant.bannerUrl
        });
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
      bannerUrl: values.bannerUrl
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
}
