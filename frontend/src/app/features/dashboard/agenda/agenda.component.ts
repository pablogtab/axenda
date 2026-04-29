import { Component, OnInit, inject, signal, computed, effect, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfessionalsService, Professional, AvailabilityException } from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ModalService } from '@services/modal.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { format, addDays, startOfDay, startOfWeek, addMonths, startOfMonth, endOfMonth, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { SidebarService } from '@services/sidebar.service';
import { startOfLocalDate, endOfLocalDate } from '@core/utils/date-utils';
import { AppointmentsService, Appointment } from '@services/appointments.service';

import { AppointmentFormComponent } from '../appointments/appointment-form/appointment-form';
import { AgendaDayViewComponent } from './views/agenda-day-view/agenda-day-view.component';
import { AgendaMonthViewComponent } from './views/agenda-month-view/agenda-month-view.component';
import { AgendaViewType } from './agenda.types';
import { AgendaSettingsComponent } from './components/agenda-settings/agenda-settings.component';
import { AgendaWeekViewComponent } from './views/agenda-week-view/agenda-week-view.component';
import { AgendaService } from './agenda.service';
import { AgendaAppointmentCardComponent } from './components/agenda-appointment-card/agenda-appointment-card.component';
import { AgendaActionSelectorComponent } from './components/agenda-action-selector/agenda-action-selector.component';
import { ProfessionalExceptionFormComponent } from '../professionals/professional-exception-form/professional-exception-form';
import { AgendaNavigationZonesComponent } from './components/agenda-navigation-zones/agenda-navigation-zones.component';

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
  public modal = inject(ModalService);
  private userConfig = inject(UserConfigurationService);
  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);
  private appointmentsService = inject(AppointmentsService);

  @ViewChild(AgendaDayViewComponent) dayView?: AgendaDayViewComponent;
  @ViewChild(AgendaWeekViewComponent) weekView?: AgendaWeekViewComponent;

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
      this.userConfig.updateAgendaStatuses(this.selectedStatuses());
    });

    // Efecto para pre-consultar períodos adyacentes y mejorar performance
    effect(() => {
      const date = this.selectedDate();
      const view = this.selectedView();
      const branchId = this.selectedBranchId();
      const statuses = this.selectedStatuses();
      
      if (branchId) {
        this.prefetchAdjacentPeriods(date, view, branchId, statuses);
      }
    });
  }

  // Estado Global de la Agenda (Inicializado desde la configuración persistida)
  selectedDate = signal<Date>(startOfDay(new Date()));
  selectedBranchId = signal<string | null>(this.userConfig.agendaSelectedBranchId());
  selectedView = signal<AgendaViewType>(this.userConfig.agendaView());
  selectedProfessionalIds = signal<string[]>(this.userConfig.agendaSelectedProfessionalIds());
  selectedStatuses = signal<string[]>(this.userConfig.agendaSelectedStatuses()); // Ahora cargado desde config

  statusFilterOptions = [
    { value: 'PENDING', label: 'Reservado', color: '#fbbf24' },
    { value: 'CONFIRMED', label: 'Confirmado', color: '#60a5fa' },
    { value: 'COMPLETED', label: 'Finalizado', color: '#c084fc' },
    { value: 'NO_SHOW', label: 'No asistió', color: '#f87171' },
    { value: 'CANCELLED', label: 'Cancelado', color: '#475569' }
  ];
  
  professionals = signal<Professional[]>([]);
  branches = signal<Branch[]>([]);
  isLoading = signal(true);
  showFilters = signal(false);
  showViewSelector = signal(false);
  showMobileSettings = signal(false);
  viewTransitionClass = signal<string>('');

  @HostListener('document:keydown', ['$event'])
  handleGlobalKeyDown(event: KeyboardEvent) {
    if (this.showFilters() || this.showViewSelector() || this.modal.hasOpenDialogs) {
      if (event.key === 'Escape') {
        this.showFilters.set(false);
        this.showViewSelector.set(false);
      }
      return;
    }

    const target = event.target as HTMLElement;
    if (target?.closest('.cdk-overlay-container')) return;

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
    if (this.showFilters() || this.showViewSelector() || this.modal.hasOpenDialogs) return;
    
    const target = event.target as HTMLElement;
    if (target?.closest('.cdk-overlay-container')) return;
    
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

  toggleStatus(status: string): void {
    const current = this.selectedStatuses();
    if (current.includes(status)) {
      if (current.length > 1) {
        this.selectedStatuses.set(current.filter(s => s !== status));
      } else {
        // Si es el último, activamos todos
        this.selectedStatuses.set(['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']);
      }
    } else {
      this.selectedStatuses.set([...current, status]);
    }
  }

  isStatusSelected(status: string): boolean {
    return this.selectedStatuses().includes(status);
  }

  // ─── Diálogos ──────────────────────────────────────────────────────────────

  onAddAppointment(event: { professional: Professional, time: string, date?: Date, endTime?: string, x?: number, y?: number, type?: 'APPOINTMENT' | 'EXCEPTION' }): void {
    const isMobile = this.sidebarService.isMobile();

    // Si ya viene con el tipo (desde vista semanal con varios profs), vamos directo
    if (event.type) {
      if (event.type === 'APPOINTMENT') {
        this.openAppointmentForm(event);
      } else {
        this.openExceptionForm(event);
      }
      return;
    }

    if (isMobile) {
      this.openAppointmentForm(event);
      return;
    }

    const dialogRef = this.modal.open(AgendaActionSelectorComponent, {
      width: '200px',
      data: { x: event.x, y: event.y },
      hasBackdrop: false,
      panelClass: 'modal-panel-dropdown'
    });

    dialogRef.closed.subscribe(action => {
      // Limpiar selecciones en las vistas al cerrar el selector
      this.dayView?.clearSelection();
      this.weekView?.clearSelection();

      if (!action) return;

      if (action === 'APPOINTMENT') {
        this.openAppointmentForm(event);
      } else if (action === 'EXCEPTION') {
        this.openExceptionForm(event);
      }
    });
  }

  onEditException(exception: AvailabilityException): void {
    // Buscar a qué profesional pertenece esta excepción
    const prof = this.professionals().find(p => p.exceptions?.some(e => e.id === exception.id));
    if (!prof) return;

    const dialogRef = this.modal.open(ProfessionalExceptionFormComponent, {
      data: {
        id: exception.id,
        professionalId: prof.id,
        date: exception.date,
        startTime: exception.startTime,
        endTime: exception.endTime,
        type: exception.type,
        reason: exception.reason
      }
    });

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.refreshView();
      }
    });
  }

  private openAppointmentForm(event: { professional: Professional, time: string, date?: Date, endTime?: string }): void {
    const appointmentDate = event.date || this.selectedDate();
    const dialogRef = this.modal.open(AppointmentFormComponent, {
      data: {
        professionalId: event.professional.id,
        startTime: event.time,
        endTime: event.endTime,
        date: format(appointmentDate, 'yyyy-MM-dd'),
        branchId: this.selectedBranchId()
      },
      width: '500px'
    });

    dialogRef.closed.subscribe(result => {
      if (result) this.refreshView();
    });
  }

  private openExceptionForm(event: { professional: Professional, time: string, date?: Date, endTime?: string }): void {
    const exceptionDate = event.date || this.selectedDate();
    let endTime = event.endTime;
    if (!endTime && event.time) {
      const [h, m] = event.time.split(':').map(Number);
      const totalMins = h * 60 + m + 15;
      const endH = Math.floor(totalMins / 60);
      const endM = totalMins % 60;
      endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    const dialogRef = this.modal.open(ProfessionalExceptionFormComponent, {
      data: {
        professionalId: event.professional.id,
        startTime: event.time,
        endTime: endTime || '',
        date: format(exceptionDate, 'yyyy-MM-dd')
      },
      width: '450px'
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
    this.loadProfessionals();
    this.selectedDate.set(new Date(this.selectedDate())); // Trigger re-render in views
  }

  openSettings(): void {
    this.modal.open(AgendaSettingsComponent, {
      width: '450px'
    });
  }

  private prefetchAdjacentPeriods(date: Date, view: AgendaViewType, branchId: string, statuses: string[]) {
    const adjacentDates: Date[] = [];
    
    if (view === 'day') {
      adjacentDates.push(addDays(date, -1));
      adjacentDates.push(addDays(date, 1));
    } else if (view === 'week') {
      adjacentDates.push(addDays(date, -7));
      adjacentDates.push(addDays(date, 7));
    } else if (view === 'month') {
      adjacentDates.push(addMonths(date, -1));
      adjacentDates.push(addMonths(date, 1));
    }

    adjacentDates.forEach(d => {
      let startDate: string;
      let endDate: string;

      if (view === 'day') {
        startDate = startOfLocalDate(d).toISOString();
        endDate = endOfLocalDate(d).toISOString();
      } else if (view === 'week') {
        const start = startOfWeek(d, { weekStartsOn: 1 });
        const end = addDays(start, 6);
        startDate = startOfLocalDate(start).toISOString();
        endDate = endOfLocalDate(end).toISOString();
      } else { // month
        const start = startOfWeek(startOfMonth(d), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(d), { weekStartsOn: 1 });
        startDate = startOfLocalDate(start).toISOString();
        endDate = endOfLocalDate(end).toISOString();
      }

      // Realizar la consulta para poblar el caché
      this.appointmentsService.findAll({
        startDate,
        endDate,
        branchId,
        statuses
      }).subscribe();
    });
  }
}
