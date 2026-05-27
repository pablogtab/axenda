import { Component, OnInit, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ServicesService, BusinessService } from '@services/services.service';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { SnackbarService } from '@services/snackbar.service';
import { forkJoin } from 'rxjs';
import { ProfessionalAvailabilityComponent } from '../professional-availability/professional-availability.component';

@Component({
  selector: 'app-professional-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProfessionalAvailabilityComponent],
  templateUrl: './professional-form.component.html'
})
export class ProfessionalFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private professionalsService = inject(ProfessionalsService);
  private branchesService = inject(BranchesService);
  private servicesService = inject(ServicesService);
  private snackbar = inject(SnackbarService);
  
  public dialogRef = inject(DialogRef, { optional: true });
  public dialogData = inject<Professional>(DIALOG_DATA, { optional: true });

  @Input() set professionalData(data: Professional | null) {
    this.professional.set(data);
    if (data) {
      this.initForm(data);
    } else if (!this.dialogData) {
      this.initForm(null);
    }
  }

  @Output() closed = new EventEmitter<boolean>();

  professional = signal<Professional | null>(null);
  professionalForm!: FormGroup;
  isEditing = false;
  isSubmitting = false;
  activeTab = signal<'basic' | 'availability'>('basic');

  allBranches = signal<Branch[]>([]);
  allServices = signal<BusinessService[]>([]);
  selectedBranches = signal<string[]>([]);
  selectedServices = signal<string[]>([]);

  setTab(tab: 'basic' | 'availability') {
    this.activeTab.set(tab);
  }

  ngOnInit(): void {
    if (this.dialogData) {
      this.professional.set(this.dialogData);
      this.initForm(this.dialogData);
    } else if (!this.professionalForm) {
      this.initForm(null);
    }
    this.loadOptions();
  }

  private initForm(data: Professional | null): void {
    this.isEditing = !!data;
    this.professionalForm = this.fb.group({
      firstName: [data?.firstName || '', [Validators.required]],
      lastName: [data?.lastName || '', [Validators.required]],
      bio: [data?.bio || ''],
      color: [data?.color || '#6366f1'],
      active: [data?.active ?? true],
      allServices: [data?.allServices ?? false]
    });

    if (this.isEditing && data) {
      this.selectedBranches.set(data.branches?.filter(b => b.branch.active).map(b => b.branch.id) || []);
      this.selectedServices.set(data.services?.filter(s => s.service.active).map(s => s.service.id) || []);
    }
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

    const profId = this.isEditing ? (this.professional()?.id || this.dialogData?.id) : null;

    const request = this.isEditing && profId
      ? this.professionalsService.update(profId, val)
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
            this.emitClose(true);
          },
          error: () => {
            this.snackbar.error('Profesional guardado, pero hubo un error con las relaciones');
            this.emitClose(true);
          }
        });
      },
      error: () => {
        this.snackbar.error('Error al guardar profesional');
        this.isSubmitting = false;
      }
    });
  }

  private emitClose(refresh: boolean): void {
    this.closed.emit(refresh);
    this.dialogRef?.close(refresh);
  }

  onCancel(): void {
    this.emitClose(false);
  }
}
