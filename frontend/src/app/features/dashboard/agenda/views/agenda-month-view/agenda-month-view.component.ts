import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, ElementRef, OnInit, OnDestroy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
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
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { Professional } from '@services/professionals.service';
import { startOfLocalDate, endOfLocalDate, toLocalDateStr } from '@core/utils/date-utils';

@Component({
  selector: 'app-agenda-month-view',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './agenda-month-view.component.html',
  styleUrls: ['./agenda-month-view.component.css'],
  styles: [`
    :host { 
      display: flex; 
      flex-direction: column; 
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class AgendaMonthViewComponent implements OnChanges, OnInit {
  private appointmentsService = inject(AppointmentsService);

  date = input.required<Date>();
  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];

  @Output() addAppointment = new EventEmitter<{ professional: Professional, time: string, date?: Date }>();
  @Output() editAppointment = new EventEmitter<Appointment>();
  @Output() dateChange = new EventEmitter<Date>();

  rawAppointments = signal<Appointment[]>([]);
  professionalsSignal = signal<Professional[]>([]);
  isLoading = signal(false);
  today = new Date();

  monthDays = computed(() => {
    const current = this.date();
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start, end });
  });

  weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  appointmentsByDay = computed(() => {
    const apps = this.rawAppointments();
    const profs = this.professionalsSignal();
    const profIds = new Set(profs.map(p => p.id));
    const filtered = apps.filter(app => profIds.has(app.professional.id));
    
    const map = new Map<string, Appointment[]>();
    filtered.forEach(app => {
      const dateStr = toLocalDateStr(new Date(app.startTime));
      const list = map.get(dateStr) || [];
      list.push(app);
      map.set(dateStr, list);
    });
    
    // Sort each day's appointments by time
    map.forEach(list => {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    return map;
  });

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['professionals']) {
      this.professionalsSignal.set(this.professionals);
    }
    if (changes['date'] || changes['branchId'] || changes['professionals']) {
      this.loadAppointments();
    }
  }

  loadAppointments(): void {
    if (!this.branchId) return;

    this.isLoading.set(true);
    const days = this.monthDays();
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
    return isSameMonth(day, this.date());
  }

  isToday(day: Date): boolean {
    return isToday(day);
  }

  getAppointmentsForDay(day: Date): Appointment[] {
    return this.appointmentsByDay().get(toLocalDateStr(day)) || [];
  }

  onAddAppointment(day: Date, event: Event): void {
    event.stopPropagation();
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
    this.editAppointment.emit(app);
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
