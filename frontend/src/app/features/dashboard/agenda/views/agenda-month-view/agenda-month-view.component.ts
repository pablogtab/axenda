import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfDay,
  isToday,
  addMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { Professional } from '@services/professionals.service';
import { startOfLocalDate, endOfLocalDate, toLocalDateStr } from '@core/utils/date-utils';

import { AgendaService } from '../../agenda.service';

@Component({
  selector: 'app-agenda-month-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda-month-view.component.html',
  styleUrls: ['./agenda-month-view.component.css']
})
export class AgendaMonthViewComponent implements OnChanges, OnInit {
  private appointmentsService = inject(AppointmentsService);
  public agendaService = inject(AgendaService);

  private _date = signal<Date>(new Date());
  @Input({ required: true }) set date(val: Date) { this._date.set(val); }
  get date() { return this._date(); }

  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];

  @Output() addAppointment = new EventEmitter<{ professional: Professional, time: string, date: Date }>();
  @Output() editAppointment = new EventEmitter<{ appointment: Appointment, newDate?: Date }>();
  @Output() dateChange = new EventEmitter<Date>();
  @Output() dayClick = new EventEmitter<Date>();
  @Output() dayContextMenu = new EventEmitter<{ day: Date, event: MouseEvent }>();

  rawAppointments = signal<Appointment[]>([]);
  professionalsSignal = signal<Professional[]>([]);
  isLoading = signal(false);
  dropPreviewDate = signal<Date | null>(null);

  today = new Date();

  monthDays = computed(() => {
    const current = this._date();
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    // Forzamos siempre 6 semanas (42 días) para que la estructura de celdas en el DOM
    // sea estable y los eventos no se pierdan al cambiar de mes.
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  });

  weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  appointmentsByDay = computed(() => {
    const apps = this.rawAppointments();
    const profs = this.professionalsSignal();
    const profIds = new Set(profs.map(p => p.id));
    const currentDays = this.monthDays();
    const firstVisibleDay = currentDays.length > 0 ? toLocalDateStr(currentDays[0]) : null;

    const draggedApp = this.agendaService.draggedApp();

    const map = new Map<string, Appointment[]>();

    const addToMap = (app: Appointment, dateStr: string) => {
      if (!profIds.has(app.professional.id)) return;
      const list = map.get(dateStr) || [];
      if (!list.some(a => a.id === app.id)) {
        list.push(app);
        map.set(dateStr, list);
      }
    };

    apps.forEach(app => {
      const dateStr = toLocalDateStr(new Date(app.startTime));
      addToMap(app, dateStr);
    });

    if (draggedApp) {
      const draggedDayStr = toLocalDateStr(new Date(draggedApp.startTime));
      const isVisible = currentDays.some(d => toLocalDateStr(d) === draggedDayStr);

      if (isVisible) {
        addToMap(draggedApp, draggedDayStr);
      } else if (firstVisibleDay) {
        // RE-HOMING: Mantenemos el turno en el DOM aunque su día no sea visible
        addToMap(draggedApp, firstVisibleDay);
      }
    }

    map.forEach(list => {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return map;
  });

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['professionals']) {
      this.professionalsSignal.set(this.professionals);
    }
    if (changes['date'] || changes['branchId'] || changes['professionals']) {
      this.loadAppointments();
    }
  }

  loadAppointments(): void {
    if (!this.branchId || !this.date) return;

    this.isLoading.set(true);
    const days = this.monthDays();
    if (days.length === 0) return;

    const start = days[0];
    const end = days[days.length - 1];

    const startDate = startOfLocalDate(start).toISOString();
    const endDate = endOfLocalDate(end).toISOString();

    this.appointmentsService.findAll({
      startDate,
      endDate,
      branchId: this.branchId
    }).subscribe({
      next: (data) => {
        this.rawAppointments.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  isCurrentMonth(day: Date): boolean {
    return isSameMonth(day, this.date);
  }

  isToday(day: Date): boolean {
    return isToday(day);
  }

  getAppointmentsForDay(day: Date): Appointment[] {
    return this.appointmentsByDay().get(toLocalDateStr(day)) || [];
  }

  onDayClick(day: Date, event: Event): void {
    event.stopPropagation();
    this.dayClick.emit(day);
  }

  onAddAppointment(day: Date, event: Event): void {
    event.stopPropagation();
    if (this.agendaService.isDragging()) return;

    if (this.professionals.length > 0) {
      this.addAppointment.emit({
        professional: this.professionals[0],
        time: '09:00',
        date: day
      });
    }
  }

  onEditApp(app: Appointment, event: Event): void {
    event.stopPropagation();
    this.editAppointment.emit({ appointment: app });
  }

  onDragStart(app: Appointment, event: DragEvent): void {
    this.agendaService.setDragging(true, app);
    this.agendaService.updateMousePosition(event.clientX, event.clientY);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Create a transparent drag image to use our custom global preview
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      event.dataTransfer.setDragImage(img, 0, 0);
    }
  }

  onDrag(event: DragEvent): void {
    // Only update if coordinates are valid (browser sometimes sends 0,0 at end)
    if (event.clientX !== 0 || event.clientY !== 0) {
      this.agendaService.updateMousePosition(event.clientX, event.clientY);
    }
  }

  onDragEnd(): void {
    this.agendaService.stopDragging();
    this.dropPreviewDate.set(null);
  }

  onDragOver(event: DragEvent, day: Date): void {
    event.preventDefault(); // Required to allow drop
    if (this.agendaService.isDragging()) {
      this.dropPreviewDate.set(day);
    }
  }

  onDrop(event: DragEvent, targetDate: Date): void {
    event.preventDefault();
    const app = this.agendaService.draggedApp();
    if (app) {
      this.editAppointment.emit({ appointment: app, newDate: targetDate });
    }
    this.onDragEnd();
  }

  formatTime(isoString: string): string {
    return format(new Date(isoString), 'HH:mm');
  }

  formatDayNumber(day: Date): string {
    const dayNum = format(day, 'd');
    if (dayNum === '1') {
      return format(day, 'd MMM', { locale: es });
    }
    return dayNum;
  }
}
