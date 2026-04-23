import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { format, startOfDay } from 'date-fns';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { Professional } from '@services/professionals.service';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
}

@Component({
  selector: 'app-agenda-day-view',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './agenda-day-view.component.html',
  styleUrls: ['./agenda-day-view.component.css']
})
export class AgendaDayViewComponent implements OnChanges {
  private appointmentsService = inject(AppointmentsService);

  @Input({ required: true }) date!: Date;
  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];

  @Output() addAppointment = new EventEmitter<{ professional: Professional, time: string }>();
  @Output() editAppointment = new EventEmitter<Appointment>();

  appointments = signal<AppointmentUI[]>([]);
  timeSlots = signal<string[]>([]);
  isLoading = signal(false);
  isDragging = signal(false);

  // Maps para optimización
  availabilityMap = signal<Record<string, boolean>>({});
  blockedMap = signal<Record<string, boolean>>({});

  appointmentsByProfessional = computed(() => {
    const map = new Map<string, AppointmentUI[]>();
    this.appointments().forEach(app => {
      const list = map.get(app.professional.id) || [];
      list.push(app);
      map.set(app.professional.id, list);
    });
    return map;
  });

  constructor() {
    this.generateTimeSlots();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] || changes['branchId'] || changes['professionals']) {
      this.loadAppointments();
      this.computeGridStatus();
    }
  }

  generateTimeSlots(): void {
    const slots: string[] = [];
    for (let hour = 8; hour < 21; hour++) {
      for (let min of ['00', '15', '30', '45']) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min}`);
      }
    }
    this.timeSlots.set(slots);
  }

  computeGridStatus(): void {
    const avail: Record<string, boolean> = {};
    const block: Record<string, boolean> = {};

    this.professionals.forEach(prof => {
      this.timeSlots().forEach(slot => {
        const key = `${prof.id}-${slot}`;
        avail[key] = this.isProfessionalAvailableAt(prof, slot);
        block[key] = this.isProfessionalBlockedAt(prof, slot);
      });
    });

    this.availabilityMap.set(avail);
    this.blockedMap.set(block);
  }

  loadAppointments(): void {
    if (!this.branchId) return;
    
    this.isLoading.set(true);
    const dateStr = format(this.date, 'yyyy-MM-dd');
    
    this.appointmentsService.findAll({ 
      startDate: dateStr, 
      endDate: dateStr,
      branchId: this.branchId
    }).subscribe({
      next: (data) => {
        const uiAppointments: AppointmentUI[] = data.map(app => {
          const start = new Date(app.startTime);
          const end = new Date(app.endTime);
          const startStr = format(start, 'HH:mm');
          const startIndex = this.timeSlots().findIndex(s => s === startStr);
          const duration = (end.getTime() - start.getTime()) / (1000 * 60);

          return {
            ...app,
            top: startIndex !== -1 ? startIndex * 25 : 0,
            height: (duration * 25) / 15
          };
        });
        
        this.appointments.set(uiAppointments);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  isProfessionalAvailableAt(prof: Professional, slot: string): boolean {
    const dayOfWeek = this.date.getDay();
    const isOut = prof.exceptions?.some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      const current = startOfDay(this.date);
      return current >= start && current <= end && (ex.type === 'HOLIDAY' || ex.type === 'LEAVE');
    });
    if (isOut) return false;

    const blocks = prof.availability?.filter(a => a.dayOfWeek === dayOfWeek) || [];
    return blocks.some(b => slot >= b.startTime && slot < b.endTime);
  }

  isProfessionalBlockedAt(prof: Professional, slot: string): boolean {
    const current = startOfDay(this.date);
    return (prof.exceptions || []).some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      return current >= start && current <= end && ex.type === 'BLOCK' && ex.startTime && ex.endTime && slot >= ex.startTime && slot < ex.endTime;
    });
  }

  onDrop(event: CdkDragDrop<any>): void {
    const app = event.item.data as Appointment;
    const newProfessionalId = event.container.id;
    const rowsMoved = Math.round(event.distance.y / 25);
    
    const start = new Date(app.startTime);
    const startStr = format(start, 'HH:mm');
    const startIndex = this.timeSlots().findIndex(s => s === startStr);
    const newIndex = startIndex + rowsMoved;
    
    if (newIndex < 0 || newIndex >= this.timeSlots().length) {
      this.refreshUI(app);
      return;
    }

    const newTimeStr = this.timeSlots()[newIndex];
    if (!this.availabilityMap()[`${newProfessionalId}-${newTimeStr}`]) {
      this.refreshUI(app);
      return;
    }

    const [hours, mins] = newTimeStr.split(':').map(Number);
    const originalDuration = new Date(app.endTime).getTime() - new Date(app.startTime).getTime();
    
    const newStartTime = new Date(this.date);
    newStartTime.setHours(hours, mins, 0, 0);
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    // Actualización optimista
    this.appointments.update(apps => apps.map(a => 
      a.id === app.id ? { 
        ...a, 
        professional: { ...a.professional, id: newProfessionalId },
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        top: newIndex * 25
      } : a
    ));

    this.appointmentsService.update(app.id, {
      professionalId: newProfessionalId,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString()
    }).subscribe({
      error: () => this.loadAppointments()
    });
  }

  private refreshUI(app: Appointment): void {
    const current = this.appointments();
    this.appointments.set(current.filter(a => a.id !== app.id));
    setTimeout(() => this.appointments.set(current), 0);
  }
}
