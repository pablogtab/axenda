import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, ElementRef, OnInit, OnDestroy, effect, HostListener, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { format, addDays, startOfWeek, endOfWeek, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { Professional } from '@services/professionals.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { SnackbarService } from '@services/snackbar.service';
import { startOfLocalDate, endOfLocalDate, createLocalDate, toLocalDateStr } from '@core/utils/date-utils';
import { AgendaZoomDirective } from '../../directives/agenda-zoom.directive';
import { AgendaTimeIndicatorComponent } from '../../components/agenda-time-indicator/agenda-time-indicator.component';
import { AgendaAppointmentCardComponent } from '../../components/agenda-appointment-card/agenda-appointment-card.component';
import { AgendaService } from '../../agenda.service';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
  dayIndex: number;
}

@Component({
  selector: 'app-agenda-week-view',
  standalone: true,
  imports: [CommonModule, AgendaZoomDirective, AgendaTimeIndicatorComponent, AgendaAppointmentCardComponent],
  templateUrl: './agenda-week-view.component.html',
  styleUrls: ['./agenda-week-view.component.css'],
  styles: [`
    :host { 
      display: flex; 
      flex-direction: column; 
      height: 100%;
      overflow: hidden;
    }
    .dragging-active {
      cursor: grabbing !important;
      user-select: none;
    }
  `]
})
export class AgendaWeekViewComponent implements OnChanges, OnInit, OnDestroy {
  private appointmentsService = inject(AppointmentsService);
  private userConfig = inject(UserConfigurationService);
  private snackbarService = inject(SnackbarService);
  private el = inject(ElementRef);
  public agendaService = inject(AgendaService);

  date = input.required<Date>();
  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];

  @Output() addAppointment = new EventEmitter<{ professional: Professional, time: string, date?: Date }>();
  @Output() editAppointment = new EventEmitter<{ appointment: Appointment, newDate?: Date }>();
  @Output() dateChange = new EventEmitter<Date>();

  rawAppointments = signal<Appointment[]>([]);
  professionalsSignal = signal<Professional[]>([]);
  todayDate = new Date();

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

  private originalDate: Date | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private dragCancelled = false;
  private wasDragging = false;

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: any) {
    if (this.pendingSelection()) {
      this.cancelSelection();
    } else if (this.agendaService.isDragging()) {
      this.dragCancelled = true;
      
      if (this.originalDate && this.originalDate.getTime() !== this.weekDaysSignal()[0]?.getTime()) {
        this.dateChange.emit(this.originalDate);
      }

      this.onDragEnd();
    }
  }

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
        const dragging = this.draggedApp();
        if (dragging && dragging.id === app.id) {
          return dragging;
        }

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
    if (changes['date']) {
      const start = startOfWeek(this.date(), { weekStartsOn: 1 });
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      this.weekDaysSignal.set(days);
    }
    if (changes['date'] || changes['branchId'] || changes['professionals']) {
      this.loadAppointments();
      this.computeGridStatus();
    }
  }

  isSameDayAsView(otherDate: Date | null): boolean {
    if (!otherDate) return false;
    return this.weekDaysSignal().some(d => isSameDay(d, otherDate!));
  }

  computeGridStatus(): void {
    const profs = this.professionalsSignal();
    if (profs.length === 0) return;

    const avail: Record<string, boolean> = {};
    const block: Record<string, boolean> = {};

    this.weekDaysSignal().forEach((day, dayIndex) => {
      this.timeSlots().forEach(slot => {
        const key = `${dayIndex}-${slot}`;
        avail[key] = profs.some(p => this.isProfessionalAvailableAt(p, day, slot));
        block[key] = profs.length === 1 ? this.isProfessionalBlockedAt(profs[0], day, slot) : false;
      });
    });

    this.availabilityMap.set(avail);
    this.blockedMap.set(block);
  }

  loadAppointments(): void {
    if (!this.branchId) return;

    this.isLoading.set(true);
    const start = this.weekDaysSignal()[0];
    const end = this.weekDaysSignal()[6];

    const startDate = startOfLocalDate(start).toISOString();
    const endDate = endOfLocalDate(end).toISOString();

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

  // ─── Lógica de Arrastre con Pointer Events ──────────────────────────────

  onPointerDown(app: AppointmentUI, event: PointerEvent): void {
    // Solo clic izquierdo
    if (event.button !== 0) return;

    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    this.agendaService.setDragging(true, app, app.height, new Date(app.startTime));
    this.agendaService.updateMousePosition(event.clientX, event.clientY);
    this.draggedApp.set(app);
    this.originalDate = new Date(this.weekDaysSignal()[0]);
    this.dragCancelled = false;
    this.wasDragging = false;
    
    document.body.classList.add('dragging-active');
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.agendaService.isDragging()) return;
    
    this.wasDragging = true;
    this.agendaService.updateMousePosition(event.clientX, event.clientY);
    this.updateDropPreviewFromCoords(event.clientX, event.clientY);
  }

  @HostListener('document:pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (!this.agendaService.isDragging()) return;

    document.body.classList.remove('dragging-active');
    this.handleDropAction();
  }

  private updateDropPreviewFromCoords(x: number, y: number): void {
    const gridEl = this.el.nativeElement.querySelector('.grid');
    if (!gridEl) return;
    
    const rect = gridEl.getBoundingClientRect();
    
    // El grid tiene un offset de 40px arriba (header) y 60px a la izquierda (time column)
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    if (relativeY < 40 || relativeX < 60 || relativeX > rect.width || relativeY > rect.height) {
      this.dropPreview.set(null);
      return;
    }
    
    const columnWidth = (rect.width - 60) / 7;
    const dayIndex = Math.floor((relativeX - 60) / columnWidth);
    
    const h = this.slotHeight();
    const rowIndex = Math.floor((relativeY - 40) / h);
    
    if (dayIndex >= 0 && dayIndex < 7 && rowIndex >= 0 && rowIndex < this.timeSlots().length) {
      const newPreview = {
        dayIndex,
        top: rowIndex * h,
        height: this.draggedApp()?.height || 0
      };
      
      if (JSON.stringify(this.dropPreview()) !== JSON.stringify(newPreview)) {
        this.dropPreview.set(newPreview);
      }
    } else {
      this.dropPreview.set(null);
    }
  }

  private handleDropAction(): void {
    if (this.dragCancelled) {
      this.dragCancelled = false;
      this.onDragEnd();
      return;
    }

    const app = this.agendaService.draggedApp();
    const preview = this.dropPreview();

    if (!app || !preview) {
      if (app) this.handleFailedDrop(app);
      this.onDragEnd();
      return;
    }

    const targetDayIndex = preview.dayIndex;
    const newTimeStr = this.timeSlots()[Math.round(preview.top / this.slotHeight())];
    const newDate = this.weekDaysSignal()[targetDayIndex];

    if (!this.availabilityMap()[`${targetDayIndex}-${newTimeStr}`]) {
      this.handleFailedDrop(app);
      this.onDragEnd();
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

      const originalProf = this.professionalsSignal().find(p => p.id === app.professional.id);
      if (originalProf && this.isProfessionalAvailableAt(originalProf, newDate, newTimeStr)) {
        this.selectedProfessionalId.set(originalProf.id);
      }
    } else {
      this.executeMove(app, newStartTime, newEndTime, this.professionalsSignal()[0]);
    }

    this.onDragEnd();
  }

  onDragEnd(): void {
    this.agendaService.stopDragging();
    this.draggedApp.set(null);
    this.dropPreview.set(null);
    this.originalDate = null;
    document.body.classList.remove('dragging-active');
  }

  executeMove(app: Appointment, newStartTime: Date, newEndTime: Date, targetProf: Professional): void {
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

    this.refreshUI(app);

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

  private handleFailedDrop(app: Appointment): void {
    this.snackbarService.warning('El profesional no está disponible en este horario.');
    if (this.originalDate && this.originalDate.getTime() !== this.weekDaysSignal()[0]?.getTime()) {
      this.dateChange.emit(this.originalDate);
    }
    this.refreshUI(app);
  }

  private refreshUI(app: Appointment): void {
    const current = this.rawAppointments();
    this.rawAppointments.set(current.filter(a => a.id !== app.id));
    setTimeout(() => this.rawAppointments.set(current), 0);
  }

  onAppClick(app: Appointment, event: Event): void {
    event.stopPropagation();
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    this.editAppointment.emit({ appointment: app });
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
