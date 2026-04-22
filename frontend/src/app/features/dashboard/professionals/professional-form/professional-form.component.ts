import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ServicesService, BusinessService } from '@services/services.service';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { SnackbarService } from '@services/snackbar.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-professional-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './professional-form.component.html'
})
export class ProfessionalFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private professionalsService = inject(ProfessionalsService);
  private branchesService = inject(BranchesService);
  private servicesService = inject(ServicesService);
  private snackbar = inject(SnackbarService);
  public dialogRef = inject(DialogRef);
  public data = inject<Professional>(DIALOG_DATA, { optional: true });

  professionalForm: FormGroup;
  isEditing = false;
  isSubmitting = false;

  allBranches = signal<Branch[]>([]);
  allServices = signal<BusinessService[]>([]);
  selectedBranches = signal<string[]>([]);
  selectedServices = signal<string[]>([]);

  constructor() {
    this.isEditing = !!this.data;
    this.professionalForm = this.fb.group({
      firstName: [this.data?.firstName || '', [Validators.required]],
      lastName: [this.data?.lastName || '', [Validators.required]],
      bio: [this.data?.bio || ''],
      color: [this.data?.color || '#6366f1'],
      active: [this.data?.active ?? true]
    });

    if (this.isEditing && this.data) {
      this.selectedBranches.set(this.data.branches?.filter(b => b.branch.active).map(b => b.branch.id) || []);
      this.selectedServices.set(this.data.services?.filter(s => s.service.active).map(s => s.service.id) || []);
    }
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  loadOptions(): void {
    forkJoin({
      branches: this.branchesService.findAll(),
      services: this.servicesService.findAll()
    }).subscribe({
      next: (res) => {
        // En el formulario solo mostramos lo que está ACTIVO para asignar
        this.allBranches.set(res.branches.filter(b => b.active));
        this.allServices.set(res.services.filter(s => s.active));
      }
    });
  }

  toggleBranch(id: string): void {
    const current = this.selectedBranches();
    if (current.includes(id)) {
      this.selectedBranches.set(current.filter(b => b !== id));
    } else {
      this.selectedBranches.set([...current, id]);
    }
  }

  toggleService(id: string): void {
    const current = this.selectedServices();
    if (current.includes(id)) {
      this.selectedServices.set(current.filter(s => s !== id));
    } else {
      this.selectedServices.set([...current, id]);
    }
  }

  onSubmit(): void {
    if (this.professionalForm.invalid) return;

    this.isSubmitting = true;
    const val = this.professionalForm.value;

    const request = this.isEditing 
      ? this.professionalsService.update(this.data!.id, val)
      : this.professionalsService.create(val);

    request.subscribe({
      next: (prof) => {
        // Actualizar relaciones después de crear/actualizar
        forkJoin({
          branches: this.professionalsService.setBranches(prof.id, this.selectedBranches()),
          services: this.professionalsService.setServices(prof.id, this.selectedServices())
        }).subscribe({
          next: () => {
            this.snackbar.success(this.isEditing ? 'Profesional actualizado' : 'Profesional creado');
            this.dialogRef.close(true);
          },
          error: () => {
            this.snackbar.error('Profesional guardado, pero hubo un error con las relaciones');
            this.dialogRef.close(true);
          }
        });
      },
      error: () => {
        this.snackbar.error('Error al guardar profesional');
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
