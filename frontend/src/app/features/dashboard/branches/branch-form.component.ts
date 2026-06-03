import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Branch, BranchesService } from '@services/branches.service';
import { SnackbarService } from '@services/snackbar.service';

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="card-glass w-[500px] max-w-full !p-10">
      <header class="flex justify-between items-center mb-8">
        <h2 class="text-3xl font-bold text-text-main">
          {{ isEditing ? 'Editar Sucursal' : 'Nueva Sucursal' }}
        </h2>
        <button
          class="text-3xl leading-none text-text-dim hover:text-red-500 transition-colors"
          (click)="onCancel()"
        >
          ×
        </button>
      </header>

      <form
        [formGroup]="branchForm"
        (ngSubmit)="onSubmit()"
        class="flex flex-col gap-6"
      >
        <div class="flex flex-col gap-2">
          <label for="name" class="text-sm font-semibold text-text-muted"
            >Nombre de la Sucursal *</label
          >
          <input
            id="name"
            type="text"
            formControlName="name"
            class="input-field"
            placeholder="Ej: Sucursal Centro"
          />
          @if (
            branchForm.get('name')?.touched && branchForm.get('name')?.invalid
          ) {
            <span class="text-xs text-red-400">El nombre es obligatorio</span>
          }
        </div>

        <div class="flex flex-col gap-2">
          <label for="address" class="text-sm font-semibold text-text-muted"
            >Dirección</label
          >
          <input
            id="address"
            type="text"
            formControlName="address"
            class="input-field"
            placeholder="Ej: Av. Corrientes 1234, CABA"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="phone" class="text-sm font-semibold text-text-muted"
            >Teléfono de Contacto</label
          >
          <input
            id="phone"
            type="text"
            formControlName="phone"
            class="input-field"
            placeholder="Ej: +54 11 ..."
          />
        </div>

        <div class="flex items-center gap-3 py-2">
          <input
            id="active"
            type="checkbox"
            formControlName="active"
            class="w-5 h-5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20"
          />
          <label
            for="active"
            class="text-sm font-medium text-text-muted cursor-pointer"
            >Sucursal activa</label
          >
        </div>

        <footer class="flex justify-end gap-4 mt-4">
          <button
            type="button"
            class="btn-secondary flex-1"
            (click)="onCancel()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn-primary flex-1"
            [disabled]="isSubmitting"
          >
            {{
              isSubmitting
                ? 'Guardando...'
                : isEditing
                  ? 'Actualizar'
                  : 'Crear Sucursal'
            }}
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [
    `
      /* Refactored to Tailwind CSS */
    `,
  ],
})
export class BranchFormComponent {
  private fb = inject(FormBuilder);
  private branchesService = inject(BranchesService);
  private snackbar = inject(SnackbarService);
  private dialogRef = inject(DialogRef);
  private data = inject<Branch | null>(DIALOG_DATA);

  isEditing = !!this.data;
  isSubmitting = false;

  branchForm: FormGroup = this.fb.group({
    name: [this.data?.name || '', [Validators.required]],
    address: [this.data?.address || ''],
    phone: [this.data?.phone || ''],
    active: [this.data?.active ?? true],
  });

  onSubmit(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload = this.branchForm.value;

    const request$ =
      this.isEditing && this.data
        ? this.branchesService.update(this.data.id, payload)
        : this.branchesService.create(payload);

    request$.subscribe({
      next: () => {
        this.snackbar.success(
          this.isEditing ? 'Sucursal actualizada' : 'Sucursal creada',
        );
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSubmitting = false;
        this.snackbar.error('Error al guardar la sucursal');
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
