import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProfessionalsService, Professional, Availability, AvailabilityException } from '@services/professionals.service';
import { SnackbarService } from '@services/snackbar.service';
import { SelectComponent, SelectConfig } from '@shared/components/select/select';
import { TimeInputComponent } from '@shared/components/time-input/time-input';

@Component({
  selector: 'app-professional-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SelectComponent, TimeInputComponent],
  templateUrl: './professional-availability.component.html'
})
export class ProfessionalAvailabilityComponent implements OnInit {
  private fb = inject(FormBuilder);
  private professionalsService = inject(ProfessionalsService);
  private snackbar = inject(SnackbarService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @Input() set professionalId(id: string | null) {
    if (id) {
      this.loadProfessional(id);
    }
  }

  professional = signal<Professional | null>(null);
  availability = signal<Availability[]>([]);
  exceptions = signal<AvailabilityException[]>([]);
  
  addForm: FormGroup;
  exceptionForm: FormGroup;
  isLoading = signal(true);

  days = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' }
  ];

  exceptionTypes = [
    { value: 'BLOCK', label: 'Bloqueo Puntual' },
    { value: 'HOLIDAY', label: 'Feriado / Vacaciones' },
    { value: 'LEAVE', label: 'Licencia' },
    { value: 'OTHER', label: 'Otro' }
  ];

  typeSelectConfig: SelectConfig = {
    displayFn: (item: any) => item.label,
    valueFn: (item: any) => item.value,
    placeholder: 'Tipo'
  };
  constructor() {
    const today = new Date().toISOString().split('T')[0];
    this.addForm = this.fb.group({
      dayOfWeek: [1, [Validators.required]],
      startTime: ['09:00', [Validators.required]],
      endTime: ['18:00', [Validators.required]],
      branchId: [null, [Validators.required]]
    });

    this.exceptionForm = this.fb.group({
      date: [today, [Validators.required]],
      endDate: [null],
      type: ['BLOCK', [Validators.required]],
      reason: ['']
    });
  }

  branchSelectConfig: SelectConfig = {
    displayFn: (item: any) => item.branch.name,
    valueFn: (item: any) => item.branch.id,
    placeholder: 'Sucursal'
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !this.professional()) {
      this.loadProfessional(id);
    }
  }

  loadProfessional(id: string): void {
    this.isLoading.set(true);
    this.professionalsService.findOne(id).subscribe({
      next: (prof) => {
        this.professional.set(prof);
        this.availability.set(prof.availability || []);
        this.exceptions.set(prof.exceptions || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackbar.error('No se pudo cargar la información del profesional');
        this.router.navigate(['/dashboard/professionals']);
      }
    });
  }

  getBranchName(branchId?: string): string {
    if (!branchId) return '';
    const branches = this.professional()?.branches || [];
    const found = branches.find(b => b.branch.id === branchId);
    return found ? found.branch.name : '';
  }

  getAvailabilityForDay(day: number): Availability[] {
    return this.availability()
      .filter(a => a.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  addingToDay = signal<number | null>(null);

  setAddingToDay(day: number): void {
    this.addingToDay.set(day);
    const branches = this.professional()?.branches || [];
    const defaultBranchId = branches.length === 1 ? branches[0].branch.id : null;
    
    this.addForm.patchValue({ 
      dayOfWeek: day, 
      startTime: '09:00', 
      endTime: '18:00',
      branchId: defaultBranchId
    });
  }

  cancelAdding(): void {
    this.addingToDay.set(null);
  }

  addSlot(): void {
    const prof = this.professional();
    if (this.addForm.invalid || !prof) return;

    const rawValue = this.addForm.value;
    const data = {
      ...rawValue,
      dayOfWeek: Number(rawValue.dayOfWeek)
    };

    this.professionalsService.addAvailability(prof.id, data).subscribe({
      next: (newSlot) => {
        this.availability.set([...this.availability(), newSlot]);
        this.snackbar.success('Horario añadido');
        this.addingToDay.set(null);
      },
      error: (err) => this.snackbar.error(err.error?.message || 'Error al añadir horario')
    });
  }

  removeSlot(id: string): void {
    const prof = this.professional();
    if (!prof) return;

    this.professionalsService.removeAvailability(prof.id, id).subscribe({
      next: () => {
        this.availability.set(this.availability().filter(a => a.id !== id));
        this.snackbar.success('Horario eliminado');
      },
      error: () => this.snackbar.error('Error al eliminar horario')
    });
  }

  addException(): void {
    const prof = this.professional();
    if (this.exceptionForm.invalid || !prof) return;

    this.professionalsService.addException(prof.id, this.exceptionForm.value).subscribe({
      next: (newEx) => {
        this.exceptions.set([...this.exceptions(), newEx]);
        this.snackbar.success('Excepción añadida');
        this.exceptionForm.reset({
          date: new Date().toISOString().split('T')[0],
          endDate: null,
          type: 'BLOCK',
          reason: ''
        });
      },
      error: (err) => this.snackbar.error(err.error?.message || 'Error al añadir excepción')
    });
  }

  removeException(id: string): void {
    const prof = this.professional();
    if (!prof) return;

    this.professionalsService.removeException(prof.id, id).subscribe({
      next: () => {
        this.exceptions.set(this.exceptions().filter(e => e.id !== id));
        this.snackbar.success('Excepción eliminada');
      },
      error: () => this.snackbar.error('Error al eliminar excepción')
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/professionals']);
  }
}
