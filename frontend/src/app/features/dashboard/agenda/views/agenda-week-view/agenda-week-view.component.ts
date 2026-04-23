import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, ElementRef, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { format, addDays, startOfWeek, endOfWeek, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { Professional } from '@services/professionals.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { SnackbarService } from '@services/snackbar.service';
import { startOfLocalDate, endOfLocalDate, createLocalDate, toLocalDateStr } from '@core/utils/date-utils';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
  dayIndex: number;
}

@Component({
  selector: 'app-agenda-week-view',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './agenda-week-view.component.html',
  styleUrls: ['./agenda-week-view.component.css'],
  styles: [`
    :host { 
      display: flex; 
      flex-direction: column; 
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class AgendaWeekViewComponent implements OnChanges, OnInit, OnDestroy {
  private appointmentsService = inject(AppointmentsService);
  private userConfig = inject(UserConfigurationService);
  private snackbarService = inject(SnackbarService);
  private el = inject(ElementRef);

  @Input({ required: true }) weekDays: Date[] = [];
  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];

  @Output() addAppointment = new EventEmitter<{ professional: Professional, time: string, date?: Date }>();
  @Output() editAppointment = new EventEmitter<Appointment>();
  @Output() dateChange = new EventEmitter<Date>();

  rawAppointments = signal<Appointment[]>([]);
  professionalsSignal = signal<Professional[]>([]);

  private zoomLevel = this.userConfig.agendaZoom;
  private startHour = this.userConfig.agendaStartHour;
  private endHour = this.userConfig.agendaEndHour;

  constructor() { }

  weekDaysSignal = signal<Date[]>([]);

  timeSlots = computed(() => {
    const start = this.startHour();
    const end = this.endHour();
    const slots: string[] = [];
    for (let hour = start; hour < end; hour++) {
      for (let min of ['00', '15', '30', '45']) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min}`);
      }
    }
    return slots;
  });

  containerHeight = signal(0);
  isLoading = signal(false);
  isDragging = signal(false);
  hoveredSlot = signal<string | null>(null);
  draggedApp = signal<AppointmentUI | null>(null);
  dropPreview = signal<{ dayIndex: number, top: number, height: number } | null>(null);

  pendingSelection = signal<{
    type: 'ADD' | 'MOVE',
    data: any,
    date?: Date,
    time?: string
  } | null>(null);

  selectedProfessionalId = signal<string | null>(null);

  private dayChangeTimeout: any;
  private originalDate: Date | null = null;
  private resizeObserver: ResizeObserver | null = null;

  slotHeight = computed(() => {
    const h = this.containerHeight();
    const slots = this.timeSlots().length;
    if (h === 0 || slots === 0) return 25;

    // Header is 40px
    const availableHeight = h - 40;
    return (availableHeight / slots) * this.zoomLevel();
  });

  selectedProfessional = computed(() => {
    return this.professionalsSignal()[0] || null;
  });

  appointments = computed(() => {
    const height = this.slotHeight();
    const slots = this.timeSlots();
    const days = this.weekDaysSignal();
    const profs = this.professionalsSignal();

    if (profs.length === 0) return [];

    const profIds = new Set(profs.map(p => p.id));

    return this.rawAppointments()
      .filter(app => profIds.has(app.professional.id))
      .map(app => {
        const appDate = new Date(app.startTime);
        const startStr = format(appDate, 'HH:mm');
        const startIndex = slots.findIndex(s => s === startStr);
        const duration = (new Date(app.endTime).getTime() - appDate.getTime()) / (1000 * 60);

        const dayStr = toLocalDateStr(appDate);
        const dayIndex = days.findIndex(d => toLocalDateStr(d) === dayStr);

        return {
          ...app,
          top: startIndex !== -1 ? startIndex * height : 0,
          height: (duration * height) / 15,
          dayIndex: dayIndex
        } as AppointmentUI;
      });
  });

  appointmentsByDay = computed(() => {
    const map = new Map<number, AppointmentUI[]>();
    this.appointments().forEach(app => {
      const list = map.get(app.dayIndex) || [];
      list.push(app);
      map.set(app.dayIndex, list);
    });
    return map;
  });

  // Maps para disponibilidad
  availabilityMap = signal<Record<string, boolean>>({});
  blockedMap = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.containerHeight.set(entry.contentRect.height);
      }
    });
    this.resizeObserver.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['professionals']) {
      this.professionalsSignal.set(this.professionals);
    }
    if (changes['weekDays']) {
      this.weekDaysSignal.set(this.weekDays);
    }
    if (changes['weekDays'] || changes['branchId'] || changes['professionals']) {
      this.loadAppointments();
      this.computeGridStatus();
    }
  }

  computeGridStatus(): void {
    const profs = this.professionalsSignal();
    if (profs.length === 0) return;

    const avail: Record<string, boolean> = {};
    const block: Record<string, boolean> = {};

    this.weekDaysSignal().forEach((day, dayIndex) => {
      this.timeSlots().forEach(slot => {
        const key = `${dayIndex}-${slot}`;
        // Si hay varios profesionales, mostramos disponible si AL MENOS UNO lo está
        avail[key] = profs.some(p => this.isProfessionalAvailableAt(p, day, slot));
        // Bloqueado solo si todos los seleccionados están bloqueados (opcional, por ahora lo dejamos así)
        block[key] = profs.length === 1 ? this.isProfessionalBlockedAt(profs[0], day, slot) : false;
      });
    });

    this.availabilityMap.set(avail);
    this.blockedMap.set(block);
  }

  loadAppointments(): void {
    if (!this.branchId) return;

    this.isLoading.set(true);

    const startDate = startOfLocalDate(this.weekDaysSignal()[0]).toISOString();
    const endDate = endOfLocalDate(this.weekDaysSignal()[6]).toISOString();

    this.appointmentsService.findAll({
      startDate,
      endDate,
      branchId: this.branchId
    }).subscribe({
      next: (data) => {
        setTimeout(() => {
          const currentDragged = this.draggedApp();
          let finalData = [...data];
          if (currentDragged && !finalData.find(a => a.id === currentDragged.id)) {
            finalData.unshift(currentDragged);
          }
          this.rawAppointments.set(finalData);
          this.isLoading.set(false);
        }, 0);
      },
      error: () => this.isLoading.set(false)
    });
  }

  isProfessionalAvailableAt(prof: Professional, date: Date, slot: string): boolean {
    const dayOfWeek = date.getDay();
    const isOut = prof.exceptions?.some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      const current = startOfDay(date);
      return current >= start && current <= end && (ex.type === 'HOLIDAY' || ex.type === 'LEAVE');
    });
    if (isOut) return false;

    const blocks = prof.availability?.filter(a => a.dayOfWeek === dayOfWeek) || [];
    return blocks.some(b => slot >= b.startTime && slot < b.endTime);
  }

  isProfessionalBlockedAt(prof: Professional, date: Date, slot: string): boolean {
    const current = startOfDay(date);
    return (prof.exceptions || []).some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      return current >= start && current <= end && ex.type === 'BLOCK' && ex.startTime && ex.endTime && slot >= ex.startTime && slot < ex.endTime;
    });
  }

  onDragStarted(app: AppointmentUI): void {
    this.isDragging.set(true);
    this.draggedApp.set(app);
    this.originalDate = new Date(this.weekDays[0]);
  }

  onDragEnded(): void {
    setTimeout(() => {
      if (this.isDragging()) {
        this.isDragging.set(false);
        this.draggedApp.set(null);
        this.dropPreview.set(null);
        this.clearDayChangeTimer();
      }
    }, 100);
  }

  onCellHover(dayIndex: number, slot: string): void {
    if (!this.isDragging() || !this.draggedApp()) return;

    const startIndex = this.timeSlots().findIndex(s => s === slot);
    if (startIndex === -1) return;

    const newPreview = {
      dayIndex,
      top: startIndex * this.slotHeight(),
      height: this.draggedApp()?.height || 0
    };

    if (JSON.stringify(this.dropPreview()) !== JSON.stringify(newPreview)) {
      this.dropPreview.set(newPreview);
    }
  }

  onDrop(event: CdkDragDrop<any[]>, dropListDayIndex: number): void {
    const app = event.item.data;
    const preview = this.dropPreview();

    if (!preview) {
      this.handleFailedDrop(app);
      this.finishDrag();
      return;
    }

    const targetDayIndex = preview.dayIndex;
    const newTimeStr = this.timeSlots()[Math.round(preview.top / this.slotHeight())];
    const newDate = this.weekDaysSignal()[targetDayIndex];

    if (!this.availabilityMap()[`${targetDayIndex}-${newTimeStr}`]) {
      this.handleFailedDrop(app);
      this.finishDrag();
      return;
    }

    const originalDuration = new Date(app.endTime).getTime() - new Date(app.startTime).getTime();
    const newStartTime = createLocalDate(toLocalDateStr(newDate), newTimeStr);
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    const moveData = {
      app,
      newStartTime,
      newEndTime
    };

    if (this.professionalsSignal().length > 1) {
      this.pendingSelection.set({
        type: 'MOVE',
        data: { ...moveData, originalProfessionalId: app.professional.id },
        date: newDate,
        time: newTimeStr
      });
      
      // Pre-seleccionar al original si está disponible
      const originalProf = this.professionalsSignal().find(p => p.id === app.professional.id);
      if (originalProf && this.isProfessionalAvailableAt(originalProf, newDate, newTimeStr)) {
        this.selectedProfessionalId.set(originalProf.id);
      }
    } else {
      this.executeMove(app, newStartTime, newEndTime, this.professionalsSignal()[0]);
    }

    this.finishDrag();
  }

  executeMove(app: Appointment, newStartTime: Date, newEndTime: Date, targetProf: Professional): void {
    // Actualización optimista local
    this.rawAppointments.update(apps => apps.map(a =>
      a.id === app.id ? {
        ...a,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        professional: {
          id: targetProf.id,
          firstName: targetProf.firstName,
          lastName: targetProf.lastName,
          color: targetProf.color || '#6366f1'
        }
      } : a
    ));

    this.appointmentsService.update(app.id, {
      startTime: newStartTime.toISOString(),
      professionalId: targetProf.id
    }).subscribe({
      error: () => this.loadAppointments()
    });
  }

  selectProfessional(prof: Professional): void {
    this.selectedProfessionalId.set(prof.id);
  }

  confirmSelection(): void {
    const pending = this.pendingSelection();
    const profId = this.selectedProfessionalId();
    if (!pending || !profId) return;

    const prof = this.professionalsSignal().find(p => p.id === profId);
    if (!prof) return;

    if (pending.type === 'MOVE') {
      const { app, newStartTime, newEndTime } = pending.data;
      this.executeMove(app, newStartTime, newEndTime, prof);
    } else if (pending.type === 'ADD') {
      this.addAppointment.emit({
        professional: prof,
        time: pending.time!,
        date: pending.date
      });
    }

    this.pendingSelection.set(null);
    this.selectedProfessionalId.set(null);
  }

  cancelSelection(): void {
    const pending = this.pendingSelection();
    if (pending && pending.type === 'MOVE') {
      this.refreshUI(pending.data.app);
    }
    
    this.pendingSelection.set(null);
    this.selectedProfessionalId.set(null);
    this.loadAppointments();
  }

  private finishDrag(): void {
    this.isDragging.set(false);
    this.draggedApp.set(null);
    this.dropPreview.set(null);
    this.originalDate = null;
    this.clearDayChangeTimer();
  }

  private handleFailedDrop(app: Appointment): void {
    this.snackbarService.warning('El profesional no está disponible en este horario.');
    if (this.originalDate && this.originalDate.getTime() !== this.weekDays[0]?.getTime()) {
      this.dateChange.emit(this.originalDate);
    }
    this.refreshUI(app);
  }

  private refreshUI(app: Appointment): void {
    const current = this.rawAppointments();
    this.rawAppointments.set(current.filter(a => a.id !== app.id));
    setTimeout(() => this.rawAppointments.set(current), 0);
  }

  onZoneEnter(direction: 'prev' | 'next'): void {
    if (!this.isDragging()) return;
    this.clearDayChangeTimer();
    this.startDayChangeTimer(direction);
  }

  private startDayChangeTimer(direction: 'prev' | 'next'): void {
    this.dayChangeTimeout = setTimeout(() => {
      if (!this.isDragging()) return;

      const newDate = new Date(this.weekDays[0]);
      // Cambiamos por semana (7 días)
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      this.dateChange.emit(newDate);

      this.startDayChangeTimer(direction);
    }, 1000); // Un poco más de delay para la semana
  }

  onZoneLeave(): void {
    this.clearDayChangeTimer();
  }

  private clearDayChangeTimer(): void {
    if (this.dayChangeTimeout) {
      clearTimeout(this.dayChangeTimeout);
      this.dayChangeTimeout = null;
    }
  }

  onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.userConfig.updateAgendaZoom(this.zoomLevel() + delta);
  }

  onAdd(day: Date, time: string): void {
    const profs = this.professionalsSignal();
    if (profs.length === 1) {
      this.addAppointment.emit({ professional: profs[0], time, date: day });
    } else if (profs.length > 1) {
      this.pendingSelection.set({
        type: 'ADD',
        data: {},
        date: day,
        time: time
      });
    }
  }
}
