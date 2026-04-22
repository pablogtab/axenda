import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Branch, BranchesService } from '@services/branches.service';
import { SnackbarService } from '@services/snackbar.service';

@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './branch-form.component.html',
  styleUrl: './branch-form.component.css'
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
    active: [this.data?.active ?? true]
  });

  onSubmit(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload = this.branchForm.value;

    const request$ = this.isEditing && this.data
      ? this.branchesService.update(this.data.id, payload)
      : this.branchesService.create(payload);

    request$.subscribe({
      next: () => {
        this.snackbar.success(this.isEditing ? 'Sucursal actualizada' : 'Sucursal creada');
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSubmitting = false;
        this.snackbar.error('Error al guardar la sucursal');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
