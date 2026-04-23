import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ModalService } from '@services/modal.service';
import { forkJoin } from 'rxjs';
import { format, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentFormComponent } from '../appointments/appointment-form/appointment-form';
import { AgendaDayViewComponent } from './views/agenda-day-view/agenda-day-view.component';
import { AgendaWeekViewComponent } from './views/agenda-week-view/agenda-week-view.component';
import { AgendaViewType } from './agenda.types';
import { Appointment } from '@services/appointments.service';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    AgendaDayViewComponent, 
    AgendaWeekViewComponent
  ],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  private professionalsService = inject(ProfessionalsService);
  private branchesService = inject(BranchesService);
  private modal = inject(ModalService);

  // Estado Global de la Agenda
  selectedDate = signal<Date>(startOfDay(new Date()));
  selectedBranchId = signal<string | null>(null);
  selectedView = signal<AgendaViewType>('day');
  
  professionals = signal<Professional[]>([]);
  branches = signal<Branch[]>([]);
  isLoading = signal(true);

  formattedDate = computed(() => {
    return format(this.selectedDate(), "EEEE d 'de' MMMM", { locale: es });
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.branchesService.findAll().subscribe({
      next: (branches) => {
        const activeBranches = branches.filter(b => b.active);
        this.branches.set(activeBranches);
        
        if (activeBranches.length > 0 && !this.selectedBranchId()) {
          this.selectedBranchId.set(activeBranches[0].id);
        }
        
        this.loadProfessionals();
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadProfessionals(): void {
    const branchId = this.selectedBranchId();
    if (!branchId) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.professionalsService.findAll(branchId).subscribe({
      next: (profs) => {
        this.professionals.set(profs.filter(p => p.active));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  changeDate(days: number): void {
    this.selectedDate.set(addDays(this.selectedDate(), days));
  }

  today(): void {
    this.selectedDate.set(startOfDay(new Date()));
  }

  onBranchChange(id: string): void {
    this.selectedBranchId.set(id);
    this.loadProfessionals();
  }

  setView(view: AgendaViewType): void {
    this.selectedView.set(view);
  }

  // ─── Diálogos ──────────────────────────────────────────────────────────────

  onAddAppointment(event: { professional: Professional, time: string }): void {
    const dialogRef = this.modal.open(AppointmentFormComponent, {
      data: {
        professionalId: event.professional.id,
        startTime: event.time,
        date: format(this.selectedDate(), 'yyyy-MM-dd'),
        branchId: this.selectedBranchId()
      },
      width: '500px'
    });

    dialogRef.closed.subscribe(result => {
      if (result) this.refreshView();
    });
  }

  onEditAppointment(appointment: Appointment): void {
    const dialogRef = this.modal.open(AppointmentFormComponent, {
      data: {
        appointmentId: appointment.id,
        professionalId: appointment.professional?.id,
        branchId: appointment.branch?.id
      },
      width: '500px'
    });

    dialogRef.closed.subscribe(result => {
      if (result) this.refreshView();
    });
  }

  private refreshView(): void {
    // Aquí podríamos disparar un evento global o simplemente dejar que las vistas reaccionen a cambios si fuera necesario,
    // pero como el loadAppointments está dentro de cada vista y reacciona a Inputs, 
    // tal vez necesitemos un Subject de refresh o simplemente recrear la referencia si queremos forzar.
    // Por ahora, al cerrar el modal, las vistas deberían refrescarse si implementamos un trigger.
    this.selectedDate.set(new Date(this.selectedDate())); // Trigger re-render
  }
}
