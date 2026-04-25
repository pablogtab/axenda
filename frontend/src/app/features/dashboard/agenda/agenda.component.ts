import { Component, OnInit, inject, signal, computed, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ModalService } from '@services/modal.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { format, addDays, startOfDay, startOfWeek, addMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { SidebarService } from '@services/sidebar.service';

import { AppointmentFormComponent } from '../appointments/appointment-form/appointment-form';
import { AgendaDayViewComponent } from './views/agenda-day-view/agenda-day-view.component';
import { AgendaMonthViewComponent } from './views/agenda-month-view/agenda-month-view.component';
import { AgendaViewType } from './agenda.types';
import { Appointment } from '@services/appointments.service';
import { AgendaSettingsComponent } from './components/agenda-settings/agenda-settings.component';
import { AgendaWeekViewComponent } from './views/agenda-week-view/agenda-week-view.component';
import { AgendaNavigationZonesComponent } from './components/agenda-navigation-zones/agenda-navigation-zones.component';
import { AgendaService } from './agenda.service';
import { AgendaAppointmentCardComponent } from './components/agenda-appointment-card/agenda-appointment-card.component';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    AgendaDayViewComponent,
    AgendaWeekViewComponent,
    AgendaMonthViewComponent,
    AgendaNavigationZonesComponent,
    AgendaAppointmentCardComponent
  ],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  private professionalsService = inject(ProfessionalsService);
  private branchesService = inject(BranchesService);
  private modal = inject(ModalService);
  private userConfig = inject(UserConfigurationService);
  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);

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
  showViewSelector = signal(false);
  showMobileSettings = signal(false);
  viewTransitionClass = signal<string>('');

  @HostListener('document:keydown', ['$event'])
  handleGlobalKeyDown(event: KeyboardEvent) {
    console.log("captured")
    if (this.showFilters()) {
      if (event.key === 'Escape') this.showFilters.set(false);
      return;
    }
    if (this.showViewSelector()) {
      if (event.key === 'Escape') this.showViewSelector.set(false);
      return;
    }

    // Navegación con Flechas
    const activeElement = document.activeElement;
    const isInput = activeElement?.tagName === 'INPUT' || 
                   activeElement?.tagName === 'TEXTAREA' || 
                   activeElement?.hasAttribute('contenteditable');
    
    if (isInput) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      this.changeDate(-1);
      this.agendaService.triggerNavigationFeedback();
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      this.changeDate(1);
      this.agendaService.triggerNavigationFeedback();
      event.preventDefault();
    }

    // Atajos de Vista
    const key = event.key.toLowerCase();
    if (key === 'd') {
      this.setView('day');
    } else if (key === 'w') {
      this.setView('week');
    } else if (key === 'm') {
      this.setView('month');
    }
  }

  private lastWheelNavTime = 0;
  private readonly wheelNavThrottle = 300;

  @HostListener('window:wheel', ['$event'])
  handleGlobalWheel(event: WheelEvent) {
    console.log("Wheel captured")
    if (this.showFilters() || this.showViewSelector()) return;
    
    // Solo permitimos navegación por rueda en vista mes o si estamos arrastrando
    if (this.selectedView() !== 'month' && !this.agendaService.isDragging()) return;

    const activeElement = document.activeElement;
    const isInput = activeElement?.tagName === 'INPUT' || 
                   activeElement?.tagName === 'TEXTAREA' || 
                   activeElement?.hasAttribute('contenteditable');
    
    if (isInput) return;

    const now = Date.now();
    if (now - this.lastWheelNavTime < this.wheelNavThrottle) return;

    if (Math.abs(event.deltaY) > 50) {
      this.lastWheelNavTime = now;
      this.changeDate(event.deltaY < 0 ? -1 : 1);
      this.agendaService.triggerNavigationFeedback();
    }
  }

  @HostListener('document:dragover', ['$event'])
  handleGlobalDragOver(event: DragEvent) {
    if (this.agendaService.isDragging()) {
      this.agendaService.updateMousePosition(event.clientX, event.clientY);
      // We don't preventDefault here to allow actual drop targets to handle it
    }
  }

  @HostListener('document:mouseup', ['$event'])
  handleGlobalMouseUp(event: MouseEvent) {
    console.log('aca mouse up')
    if (this.agendaService.isDragging()) {
      // Si estamos navegando (cambio de mes), ignoramos el mouseup global por completo
      // porque el navegador suele disparar eventos falsos al reconstruir el DOM.
      if (this.agendaService.isNavigating()) {
        return;
      }
      
      // Para otros casos, damos un pequeño margen
      setTimeout(() => {
        if (this.agendaService.isDragging()) {
          this.agendaService.stopDragging();
        }
      }, 300);
    }
  }

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

  currentDateLabel = computed(() => {
    const date = this.selectedDate();
    const view = this.selectedView();
    
    if (view === 'day') {
      return format(date, "EEEE, d 'de' MMMM", { locale: es });
    }
    
    if (view === 'week') {
      const { start, end } = this.weekRange();
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'd')} - ${format(end, "d 'de' MMMM 'de' yyyy")}`;
      }
      return `${format(start, 'd MMM')} - ${format(end, "d MMM yyyy")}`;
    }
    
    // Month view
    return format(date, "MMMM 'de' yyyy", { locale: es });
  });
  
  navLabels = computed(() => {
    const view = this.selectedView();
    const isMobile = this.sidebarService.isMobile();
    const timeColWidth = isMobile ? '45px' : '60px';
    
    if (view === 'day') return { prev: 'Día Anterior', next: 'Día Siguiente', offset: timeColWidth };
    if (view === 'week') return { prev: 'Semana Anterior', next: 'Semana Siguiente', offset: timeColWidth };
    return { prev: 'Mes Anterior', next: 'Mes Siguiente', offset: '0px' };
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
    const view = this.selectedView();
    const oldDate = this.selectedDate();
    
    const direction = days > 0 ? 'slide-next' : 'slide-prev';
    this.viewTransitionClass.set(direction);
    
    if (view === 'month') {
      const newDate = addMonths(startOfMonth(oldDate), days);
      // Usamos setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
      // y dar tiempo al sistema de Drag&Drop a estabilizarse
      setTimeout(() => {
        this.selectedDate.set(newDate);
        setTimeout(() => this.viewTransitionClass.set(''), 450);
      }, 0);
    } else {
      const step = view === 'week' ? days * 7 : days;
      const newDate = addDays(oldDate, step);
      setTimeout(() => {
        this.selectedDate.set(newDate);
        setTimeout(() => this.viewTransitionClass.set(''), 450);
      }, 0);
    }
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

  onEditAppointment(appointment: Appointment, newDate?: Date): void {
    const dialogRef = this.modal.open(AppointmentFormComponent, {
      data: {
        appointmentId: appointment.id,
        professionalId: appointment.professional?.id,
        branchId: appointment.branch?.id,
        date: newDate ? format(newDate, 'yyyy-MM-dd') : undefined
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
