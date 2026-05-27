import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { BusinessService, ServicesService, ServiceCategory } from '@services/services.service';
import { SnackbarService } from '@services/snackbar.service';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './service-form.component.html',
  styleUrl: './service-form.component.css'
})
export class ServiceFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private servicesService = inject(ServicesService);
  private snackbar = inject(SnackbarService);
  private dialogRef = inject(DialogRef);
  private data = inject<BusinessService | null>(DIALOG_DATA);

  categories = signal<ServiceCategory[]>([]);
  isEditing = !!this.data;
  isSubmitting = false;

  serviceForm: FormGroup = this.fb.group({
    name: [this.data?.name || '', [Validators.required]],
    description: [this.data?.description || ''],
    duration: [this.data?.duration || 30, [Validators.required, Validators.min(5)]],
    price: [this.data?.price || 0, [Validators.required, Validators.min(0)]],
    color: [this.data?.color || '#6366f1', [Validators.required]],
    categoryId: [this.data?.categoryId || ''],
    active: [this.data?.active ?? true],
    isBookablePublic: [this.data?.isBookablePublic ?? true],
    showPrice: [this.data?.showPrice ?? true],
    customPriceLabel: [this.data?.customPriceLabel || ''],
    showDuration: [this.data?.showDuration ?? true]
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.servicesService.findAllCategories().subscribe({
      next: (data) => this.categories.set(data),
      error: () => this.snackbar.error('No se pudieron cargar las categorías')
    });
  }

  onSubmit(): void {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload = this.serviceForm.value;

    const request$ = this.isEditing && this.data
      ? this.servicesService.update(this.data.id, payload)
      : this.servicesService.create(payload);

    request$.subscribe({
      next: () => {
        this.snackbar.success(this.isEditing ? 'Servicio actualizado' : 'Servicio creado');
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSubmitting = false;
        this.snackbar.error('Error al guardar el servicio');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
