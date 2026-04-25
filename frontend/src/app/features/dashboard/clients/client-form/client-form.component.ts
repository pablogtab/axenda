import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Client, ClientsService } from '@services/clients.service';
import { SnackbarService } from '@services/snackbar.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.css'
})
export class ClientFormComponent {
  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private snackbar = inject(SnackbarService);
  private dialogRef = inject(DialogRef);
  private data = inject<Client | null>(DIALOG_DATA);

  clientForm: FormGroup = this.fb.group({
    firstName: [this.data?.firstName || '', [Validators.required]],
    lastName: [this.data?.lastName || '', [Validators.required]],
    email: [this.data?.email || '', [Validators.email]],
    phone: [this.data?.phone || ''],
    document: [this.data?.document || ''],
    notes: [this.data?.notes || ''],
    active: [this.data?.active ?? true]
  });

  isEditing = !!this.data;
  currentClientId: string | null = this.data?.id || null;
  isSubmitting = false;

  onSubmit(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValues = this.clientForm.value;
    
    // Limpiar campos vacíos para evitar errores de validación en el backend (ej: email "")
    const payload: any = {};
    Object.keys(formValues).forEach(key => {
      const value = formValues[key];
      if (value !== '' && value !== null && value !== undefined) {
        payload[key] = value;
      }
    });

    const request$ = this.isEditing && this.currentClientId
      ? this.clientsService.update(this.currentClientId, payload)
      : this.clientsService.create(payload);

    request$.subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.snackbar.success(this.isEditing ? 'Cliente actualizado con éxito' : 'Cliente creado con éxito');
        this.dialogRef.close(res);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message?.[0] || 'Error al guardar el cliente';
        this.snackbar.error(msg);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

