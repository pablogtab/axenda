import { Component, inject, OnInit, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { BusinessService, ServicesService, ServiceCategory } from '@services/services.service';
import { SnackbarService } from '@services/snackbar.service';
import { TenantsService } from '@services/tenants.service';
import { DialogService } from '@services/dialog.service';
import { ImageUploaderComponent } from '@shared/components/image-uploader/image-uploader.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { StoragePipe } from '@shared/pipes/storage.pipe';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ImageUploaderComponent, IconComponent, StoragePipe],
  templateUrl: './service-form.component.html',
  styleUrl: './service-form.component.css'
})
export class ServiceFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private servicesService = inject(ServicesService);
  private snackbar = inject(SnackbarService);
  private tenantsService = inject(TenantsService);
  private dialog = inject(DialogService);

  @Input() service: BusinessService | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  categories = signal<ServiceCategory[]>([]);
  isEditing = signal(false);
  isSubmitting = false;

  tenantId = computed(() => this.tenantsService.currentTenant()?.id || '');

  // Listas reactivas
  includesList = signal<string[]>([]);
  galleryList = signal<string[]>([]);
  currentIncludeInput = '';

  // Drag & drop reordering
  dragIndex = signal<number>(-1);
  dragOverIndex = signal<number>(-1);

  onDragStart(index: number): void {
    this.dragIndex.set(index);
  }

  onDragEnter(index: number): void {
    this.dragOverIndex.set(index);
  }

  onDragEnd(): void {
    const from = this.dragIndex();
    const to = this.dragOverIndex();
    if (from !== -1 && to !== -1 && from !== to) {
      const list = [...this.galleryList()];
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      this.galleryList.set(list);
      // Si la portada cambió de índice la mantenemos igual (por key, no índice)
      this.serviceForm.markAsDirty();
    }
    this.dragIndex.set(-1);
    this.dragOverIndex.set(-1);
  }

  serviceForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    duration: [30, [Validators.required, Validators.min(5)]],
    price: [0, [Validators.required, Validators.min(0)]],
    color: ['#6366f1', [Validators.required]],
    categoryId: [''],
    active: [true],
    isBookablePublic: [true],
    showPrice: [true],
    customPriceLabel: [''],
    showDuration: [true],
    indications: [''],
    includes: [[]],
    mainImageKey: [''],
    galleryKeys: [[]]
  });

  ngOnInit(): void {
    this.loadCategories();
    
    if (this.service) {
      this.isEditing.set(true);
      this.serviceForm.patchValue({
        name: this.service.name,
        description: this.service.description || '',
        duration: this.service.duration,
        price: this.service.price,
        color: this.service.color || '#6366f1',
        categoryId: this.service.categoryId || '',
        active: this.service.active,
        isBookablePublic: this.service.isBookablePublic ?? true,
        showPrice: this.service.showPrice ?? true,
        customPriceLabel: this.service.customPriceLabel || '',
        showDuration: this.service.showDuration ?? true,
        indications: this.service.indications || '',
        includes: this.service.includes || [],
        mainImageKey: this.service.mainImageKey || '',
        galleryKeys: this.service.galleryKeys || []
      });
      this.includesList.set(this.service.includes || []);
      this.galleryList.set(this.service.galleryKeys || []);
    } else {
      this.isEditing.set(false);
      this.includesList.set([]);
      this.galleryList.set([]);
    }
  }

  loadCategories(): void {
    this.servicesService.findAllCategories().subscribe({
      next: (data) => this.categories.set(data),
      error: () => this.snackbar.error('No se pudieron cargar las categorías')
    });
  }

  addInclude(event: Event): void {
    event.preventDefault();
    const val = this.currentIncludeInput.trim();
    if (val && !this.includesList().includes(val)) {
      this.includesList.update(list => [...list, val]);
      this.currentIncludeInput = '';
    }
  }

  removeInclude(index: number): void {
    this.includesList.update(list => list.filter((_, i) => i !== index));
  }

  onImageUploaded(key: string): void {
    if (!key) return;
    if (this.galleryList().includes(key)) return;
    if (this.galleryList().length >= 5) return; // límite máximo
    this.galleryList.update(list => [...list, key]);
    // Auto-set cover image if none is currently selected
    if (!this.serviceForm.get('mainImageKey')?.value) {
      this.serviceForm.get('mainImageKey')?.setValue(key);
    }
    this.serviceForm.markAsDirty();
  }

  setMainImage(key: string): void {
    this.serviceForm.get('mainImageKey')?.setValue(key);
    this.serviceForm.markAsDirty();
  }

  removeImage(key: string): void {
    this.galleryList.update(list => list.filter(k => k !== key));
    
    // If the removed image was the cover photo, select another one or clear
    if (this.serviceForm.get('mainImageKey')?.value === key) {
      const remaining = this.galleryList();
      this.serviceForm.get('mainImageKey')?.setValue(remaining.length > 0 ? remaining[0] : '');
    }
    this.serviceForm.markAsDirty();
  }

  onSubmit(): void {
    // Sincronizar señales con los controles del formulario
    this.serviceForm.get('includes')?.setValue(this.includesList());
    this.serviceForm.get('galleryKeys')?.setValue(this.galleryList());

    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload = { ...this.serviceForm.value };
    
    // Convert empty string categoryId to null to pass UUID validation
    if (payload.categoryId === '') {
      payload.categoryId = null;
    }

    const request$ = this.isEditing() && this.service
      ? this.servicesService.update(this.service.id, payload)
      : this.servicesService.create(payload);

    request$.subscribe({
      next: () => {
        this.snackbar.success(this.isEditing() ? 'Servicio actualizado' : 'Servicio creado');
        this.save.emit();
      },
      error: () => {
        this.isSubmitting = false;
        this.snackbar.error('Error al guardar el servicio');
      }
    });
  }

  async onCancel(): Promise<void> {
    if (this.serviceForm.dirty) {
      const confirmed = await this.dialog.confirm({
        title: '¿Descartar cambios?',
        message: 'Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?',
        type: 'warning',
        confirmText: 'Descartar',
        cancelText: 'Seguir editando'
      });
      if (!confirmed) return;
    }
    this.cancel.emit();
  }
}
