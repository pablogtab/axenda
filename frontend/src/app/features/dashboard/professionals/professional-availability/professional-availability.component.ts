import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProfessionalsService, Professional, Availability } from '@services/professionals.service';
import { SnackbarService } from '@services/snackbar.service';

@Component({
  selector: 'app-professional-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './professional-availability.component.html'
})
export class ProfessionalAvailabilityComponent implements OnInit {
  private fb = inject(FormBuilder);
  private professionalsService = inject(ProfessionalsService);
  private snackbar = inject(SnackbarService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  professional = signal<Professional | null>(null);
  availability = signal<Availability[]>([]);
  addForm: FormGroup;
  isLoading = signal(true);

  days = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' }
  ];

  constructor() {
    this.addForm = this.fb.group({
      dayOfWeek: [1, [Validators.required]],
      startTime: ['09:00', [Validators.required]],
      endTime: ['18:00', [Validators.required]]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProfessional(id);
    } else {
      this.router.navigate(['/dashboard/professionals']);
    }
  }

  loadProfessional(id: string): void {
    this.isLoading.set(true);
    this.professionalsService.findOne(id).subscribe({
      next: (prof) => {
        this.professional.set(prof);
        this.availability.set(prof.availability || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackbar.error('No se pudo cargar la información del profesional');
        this.router.navigate(['/dashboard/professionals']);
      }
    });
  }

  getAvailabilityForDay(day: number): Availability[] {
    return this.availability()
      .filter(a => a.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
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
        this.addForm.patchValue({ startTime: '09:00', endTime: '18:00' }); // Reset parcial
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

  goBack(): void {
    this.router.navigate(['/dashboard/professionals']);
  }
}
