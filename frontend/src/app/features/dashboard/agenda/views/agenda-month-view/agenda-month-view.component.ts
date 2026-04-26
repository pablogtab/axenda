import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, OnInit, ElementRef, HostListener } from '@angular/core';
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
import { startOfLocalDate, endOfLocalDate, toLocalDateStr, parseISODateToLocal } from '@core/utils/date-utils';

import { AgendaService } from '../../agenda.service';
import { SidebarService } from '@core/services/sidebar.service';

@Component({
  selector: 'app-agenda-month-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda-month-view.component.html',
  styleUrls: ['./agenda-month-view.component.css']
})
export class AgendaMonthViewComponent implements OnChanges, OnInit {
  private appointmentsService = inject(AppointmentsService);
  private el = inject(ElementRef);
  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);

  private _date = signal<Date>(new Date());
  @Input({ required: true }) set date(val: Date) { this._date.set(val); }
  get date() { return this._date(); }

  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];
  @Input() selectedStatuses: string[] = [];

  @Output() addAppointment = new EventEmitter<{ professional: Professional, time: string, date: Date, type?: 'APPOINTMENT' | 'EXCEPTION' }>();
  @Output() editAppointment = new EventEmitter<{ appointment: Appointment, newDate?: Date }>();
  @Output() dateChange = new EventEmitter<Date>();
  @Output() dayClick = new EventEmitter<Date>();
  @Output() dayContextMenu = new EventEmitter<{ day: Date, event: MouseEvent }>();

  rawAppointments = signal<Appointment[]>([]);
  professionalsSignal = signal<Professional[]>([]);
  isLoading = signal(false);
  dropPreviewDate = signal<Date | null>(null);
  private wasDragging = false;
  private dragTimeout: any = null;
  private isPreDragging = false;

  today = new Date();

  monthDays = computed(() => {
    const current = this._date();
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });

    // Calculamos el intervalo real de días necesarios para cubrir el mes completo por semanas
    return eachDayOfInterval({ start, end });
  });

  monthRows = computed(() => {
    return this.monthDays().length / 7;
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
      if (this.selectedStatuses.length > 0 && !this.selectedStatuses.includes(app.status)) return;
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
    if (changes['date'] || changes['branchId'] || changes['professionals'] || changes['selectedStatuses']) {
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
      branchId: this.branchId,
      statuses: this.selectedStatuses
    }).subscribe({
      next: (data) => {
        this.rawAppointments.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  isSameDayAsView(otherDate: Date | null): boolean {
    if (!otherDate) return false;
    return this.monthDays().some(d => isSameDay(d, otherDate!));
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

  getBlocksForDay(day: Date): any[] {
    const blocks: any[] = [];
    const profs = this.professionalsSignal();
    
    profs.forEach(prof => {
      (prof.exceptions || []).forEach(ex => {
        if (ex.type === 'BLOCK') {
          const exDate = parseISODateToLocal(ex.date);
          if (isSameDay(exDate, day)) {
            blocks.push({ ...ex, professional: prof });
          }
        }
      });
    });
    
    return blocks;
  }

  onAddAppointment(day: Date, event: Event): void {
    event.stopPropagation();
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    if (this.agendaService.isDragging()) return;

    if (this.professionals.length > 0) {
      this.addAppointment.emit({
        professional: this.professionals[0],
        time: '09:00',
        date: day,
        type: 'APPOINTMENT'
      });
    }
  }

  onEditApp(app: Appointment, event: Event): void {
    event.stopPropagation();
    this.editAppointment.emit({ appointment: app });
  }

  // ─── Lógica de Arrastre con Pointer Events ──────────────────────────────

  onPointerDown(app: Appointment, event: PointerEvent): void {
    if (event.button !== 0) return;

    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    this.isPreDragging = true;
    
    const startX = event.clientX;
    const startY = event.clientY;

    this.dragTimeout = setTimeout(() => {
      this.startDragging(app, startX, startY, target.offsetWidth);
    }, 180); // 180ms delay
  }

  private startDragging(app: Appointment, x: number, y: number, width: number): void {
    this.isPreDragging = false;
    this.agendaService.setDragging(true, app, 40, width, new Date(app.startTime));
    this.agendaService.updateMousePosition(x, y);
    this.wasDragging = false;
    document.body.classList.add('dragging-active');
    
    // Actualizar preview inmediatamente
    this.updateDropPreviewFromCoords(x, y);
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
    if (this.dragTimeout) {
      clearTimeout(this.dragTimeout);
      this.dragTimeout = null;
    }

    if (this.isPreDragging) {
      this.isPreDragging = false;
      return;
    }

    if (!this.agendaService.isDragging()) return;

    document.body.classList.remove('dragging-active');
    this.handleDropAction();
  }

  private updateDropPreviewFromCoords(x: number, y: number): void {
    const gridEl = this.el.nativeElement.querySelector('.month-grid');
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;

    if (relativeX < 0 || relativeY < 0 || relativeX > rect.width || relativeY > rect.height) {
      this.dropPreviewDate.set(null);
      return;
    }

    const colWidth = rect.width / 7;
    const rows = this.monthRows();
    const rowHeight = rect.height / rows;

    const col = Math.floor(relativeX / colWidth);
    const row = Math.floor(relativeY / rowHeight);

    const index = row * 7 + col;
    const days = this.monthDays();
    if (index >= 0 && index < days.length) {
      const day = days[index];
      if (this.dropPreviewDate() !== day) {
        this.dropPreviewDate.set(day);
      }
    } else {
      this.dropPreviewDate.set(null);
    }
  }

  private handleDropAction(): void {
    const app = this.agendaService.draggedApp();
    const targetDate = this.dropPreviewDate();

    if (app && targetDate) {
      this.editAppointment.emit({ appointment: app, newDate: targetDate });
    }

    this.onDragEnd();
  }

  onDragEnd(): void {
    this.agendaService.stopDragging();
    this.dropPreviewDate.set(null);
    document.body.classList.remove('dragging-active');
  }

  onExceptionClick(exception: any, event: Event): void {
    event.stopPropagation();
    // En vista mensual no editamos excepciones por ahora, 
    // pero mantenemos el método para evitar errores de template
  }

  formatTime(isoString: string): string {
    return format(new Date(isoString), 'HH:mm');
  }

  formatDayNumber(day: Date): string {
    const dayNum = format(day, 'd');
    if (dayNum === '1') {
      return format(day, "d 'de' MMM", { locale: es }); //1 de Abr
    }
    return dayNum;
  }

  onAppClick(app: Appointment, event: Event): void {
    event.stopPropagation();
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    this.onEditApp(app, event);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return '#fbbf24';
      case 'CONFIRMED': return '#60a5fa';
      case 'COMPLETED': return '#c084fc';
      case 'NO_SHOW': return '#f87171';
      case 'CANCELLED': return '#475569';
      default: return '#fbbf24';
    }
  }
}
