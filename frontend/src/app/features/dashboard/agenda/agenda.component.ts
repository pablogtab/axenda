import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ModalService } from '@services/modal.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { format, addDays, startOfDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentFormComponent } from '../appointments/appointment-form/appointment-form';
import { AgendaDayViewComponent } from './views/agenda-day-view/agenda-day-view.component';
import { AgendaWeekViewComponent } from './views/agenda-week-view/agenda-week-view.component';
import { AgendaViewType } from './agenda.types';
import { Appointment } from '@services/appointments.service';
import { AgendaSettingsComponent } from './components/agenda-settings/agenda-settings.component';

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
  private userConfig = inject(UserConfigurationService);

  constructor() {
    // Sincronizar cambios de vuelta a la configuración de usuario para persistencia
    effect(() => {
      this.userConfig.updateAgendaBranchId(this.selectedBranchId());
    });
    effect(() => {
      this.userConfig.updateAgendaProfessionalIds(this.selectedProfessionalIds());
    });
    effect(() => {
      this.userConfig.updateAgendaView(this.selectedView());
    });

    effect(() => {
      console.log('[AgendaComponent] ID Profesional seleccionado:', this.selectedProfessionalIds());
      console.log('[AgendaComponent] Profesionales enviados a las vistas:', this.activeProfessionals());
    });
  }

  // Estado Global de la Agenda (Inicializado desde la configuración persistida)
  selectedDate = signal<Date>(startOfDay(new Date()));
  selectedBranchId = signal<string | null>(this.userConfig.agendaSelectedBranchId());
  selectedView = signal<AgendaViewType>(this.userConfig.agendaView());
  selectedProfessionalIds = signal<string[]>(this.userConfig.agendaSelectedProfessionalIds());
  
  professionals = signal<Professional[]>([]);
  branches = signal<Branch[]>([]);
  isLoading = signal(true);
  showFilters = signal(false);

  selectedProfessionalName = computed(() => {
    const ids = this.selectedProfessionalIds();
    const all = this.professionals();
    if (ids.length === 0 || ids.length === all.length) return 'Todos los Profesionales';
    if (ids.length === 1) {
      const prof = all.find(p => p.id === ids[0]);
      return prof ? `${prof.firstName} ${prof.lastName}` : '1 Profesional';
    }
    return `${ids.length} Profesionales`;
  });

  selectedBranchName = computed(() => {
    const id = this.selectedBranchId();
    const branch = this.branches().find(b => b.id === id);
    return branch ? branch.name : 'Seleccionar Sucursal';
  });

  activeProfessionals = computed(() => {
    const ids = this.selectedProfessionalIds();
    const all = this.professionals();
    if (ids.length === 0) return all;
    return all.filter(p => ids.includes(p.id));
  });

  isAllProfessionalsSelected = computed(() => {
    return this.selectedProfessionalIds().length === 0 || 
           this.selectedProfessionalIds().length === this.professionals().length;
  });

  weekRange = computed(() => {
    const date = this.selectedDate();
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return { start, end };
  });

  weekDays = computed(() => {
    const { start } = this.weekRange();
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  });

  formattedDate = computed(() => {
    const date = this.selectedDate();
    if (this.selectedView() === 'day') {
      return format(date, "EEEE d 'de' MMMM", { locale: es });
    } else {
      const { start, end } = this.weekRange();
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'd')} - ${format(end, "d 'de' MMMM", { locale: es })}`;
      } else {
        return `${format(start, "d 'de' MMM", { locale: es })} - ${format(end, "d 'de' MMM", { locale: es })}`;
      }
    }
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
        
        if (activeBranches.length > 0) {
          const currentId = this.selectedBranchId();
          const exists = activeBranches.some(b => b.id === currentId);
          if (!exists) {
            this.selectedBranchId.set(activeBranches[0].id);
          }
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
    const step = this.selectedView() === 'week' ? days * 7 : days;
    this.selectedDate.set(addDays(this.selectedDate(), step));
  }

  today(): void {
    this.selectedDate.set(startOfDay(new Date()));
  }

  onBranchChange(id: string): void {
    this.selectedBranchId.set(id);
    this.selectedProfessionalIds.set([]); // Al cambiar de sucursal, reseteamos los filtros de profesionales
    this.loadProfessionals();
  }

  setView(view: AgendaViewType): void {
    this.selectedView.set(view);
  }

  toggleProfessional(id: string): void {
    const current = this.selectedProfessionalIds();
    if (current.includes(id)) {
      this.selectedProfessionalIds.set(current.filter(i => i !== id));
    } else {
      this.selectedProfessionalIds.set([...current, id]);
    }
  }

  toggleAllProfessionals(): void {
    if (this.isAllProfessionalsSelected()) {
      // If all are selected (or none explicitly, which means all), we clear to "none" but in our logic none = all.
      // Wait, if I want to "deselect all", I should probably have a state where nothing is visible?
      // Usually "Todos" means showing all.
      this.selectedProfessionalIds.set(this.professionals().map(p => p.id));
    } else {
      this.selectedProfessionalIds.set([]); // Logic: empty = all
    }
  }
  
  // Re-evaluating the logic: 
  // Empty array = show all.
  // Full array = show all.
  // This might be confusing. Let's make it explicit:
  // selectedProfessionalIds should always contain what is checked.
  // On init, it should be empty (all).
  
  selectOnlyProfessional(id: string): void {
    this.selectedProfessionalIds.set([id]);
  }

  selectAllProfessionals(): void {
    this.selectedProfessionalIds.set([]);
  }

  // ─── Diálogos ──────────────────────────────────────────────────────────────

  onAddAppointment(event: { professional: Professional, time: string, date?: Date }): void {
    const appointmentDate = event.date || this.selectedDate();
    const dialogRef = this.modal.open(AppointmentFormComponent, {
      data: {
        professionalId: event.professional.id,
        startTime: event.time,
        date: format(appointmentDate, 'yyyy-MM-dd'),
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

  openSettings(): void {
    this.modal.open(AgendaSettingsComponent, {
      width: '450px'
    });
  }
}
