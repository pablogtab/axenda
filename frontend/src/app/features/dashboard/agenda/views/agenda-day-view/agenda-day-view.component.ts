import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { format, startOfDay } from 'date-fns';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { Professional } from '@services/professionals.service';
import { startOfLocalDate, endOfLocalDate, createLocalDate } from '@core/utils/date-utils';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
}

@Component({
  selector: 'app-agenda-day-view',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './agenda-day-view.component.html',
  styleUrls: ['./agenda-day-view.component.css'],
  styles: [`
    :host { 
      display: flex; 
      flex-direction: column; 
      height: 100%;
      overflow: hidden;
    }
  `]
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
  draggedApp = signal<AppointmentUI | null>(null);
  dropPreview = signal<{ professionalId: string, top: number, height: number } | null>(null);
  
  private dayChangeTimeout: any;
  @Output() dateChange = new EventEmitter<Date>();

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
    
    // Rango completo del día local en formato ISO
    const startDate = startOfLocalDate(this.date).toISOString();
    const endDate = endOfLocalDate(this.date).toISOString();

    console.log(`[Agenda] Cargando turnos desde ${startDate} hasta ${endDate} en sucursal ${this.branchId}`);
    
    this.appointmentsService.findAll({ 
      startDate, 
      endDate,
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

        // Usamos setTimeout para sacar la actualización del ciclo actual de detección
        // de cambios y evitar conflictos con las manipulaciones del DOM de CDK.
        setTimeout(() => {
          const currentDragged = this.draggedApp();
          
          // Si estamos arrastrando, nos aseguramos de que el turno persistente
          // esté en la lista, pero solo si no vino ya en la nueva data
          if (currentDragged && !uiAppointments.find(a => a.id === currentDragged.id)) {
            // Lo insertamos al principio para que Angular tenga una referencia más estable
            uiAppointments.unshift(currentDragged);
          }

          this.appointments.set(uiAppointments);
          this.isLoading.set(false);
        }, 0);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onDragStarted(app: AppointmentUI): void {
    this.isDragging.set(true);
    this.draggedApp.set(app);
  }

  onDragEnded(): void {
    // Delay para permitir que onDrop lea el preview antes de limpiar
    setTimeout(() => {
      if (this.isDragging()) {
        this.isDragging.set(false);
        this.draggedApp.set(null);
        this.dropPreview.set(null);
        this.clearDayChangeTimer();
      }
    }, 100);
  }

  onCellHover(prof: Professional, slot: string): void {
    if (!this.isDragging() || !this.draggedApp()) return;
    
    const startIndex = this.timeSlots().findIndex(s => s === slot);
    if (startIndex === -1) return;

    const newPreview = {
      professionalId: prof.id,
      top: startIndex * 25,
      height: this.draggedApp()?.height || 0
    };

    if (JSON.stringify(this.dropPreview()) !== JSON.stringify(newPreview)) {
      this.dropPreview.set(newPreview);
    }
  }

  onZoneEnter(direction: 'prev' | 'next'): void {
    if (!this.isDragging()) return;
    this.clearDayChangeTimer();
    this.startDayChangeTimer(direction);
  }

  private startDayChangeTimer(direction: 'prev' | 'next'): void {
    this.dayChangeTimeout = setTimeout(() => {
      if (!this.isDragging()) return;

      const newDate = new Date(this.date);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      this.dateChange.emit(newDate);
      
      // Reiniciar para permitir cambio continuo (scroll temporal)
      this.startDayChangeTimer(direction);
    }, 800);
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

  onDrop(event: CdkDragDrop<any[]>): void {
    const app = event.item.data;
    const preview = this.dropPreview();
    
    if (!preview) {
      this.refreshUI(app);
      this.finishDrag();
      return;
    }

    const newProfessionalId = preview.professionalId;
    const newIndex = preview.top / 25;
    const newTimeStr = this.timeSlots()[newIndex];

    if (!this.availabilityMap()[`${newProfessionalId}-${newTimeStr}`]) {
      this.refreshUI(app);
      this.finishDrag();
      return;
    }

    const originalDuration = new Date(app.endTime).getTime() - new Date(app.startTime).getTime();
    const dateStr = format(this.date, 'yyyy-MM-dd');
    const newStartTime = createLocalDate(dateStr, newTimeStr);
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    this.appointments.update(apps => apps.map(a => 
      a.id === app.id ? { 
        ...a, 
        professional: { ...a.professional, id: newProfessionalId },
        professionalId: newProfessionalId,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        top: newIndex * 25
      } : a
    ));

    this.appointmentsService.update(app.id, {
      professionalId: newProfessionalId,
      startTime: newStartTime.toISOString()
    }).subscribe({
      error: () => this.loadAppointments()
    });

    this.finishDrag();
  }

  private finishDrag(): void {
    this.isDragging.set(false);
    this.draggedApp.set(null);
    this.dropPreview.set(null);
    this.clearDayChangeTimer();
  }

  private refreshUI(app: Appointment): void {
    const current = this.appointments();
    this.appointments.set(current.filter(a => a.id !== app.id));
    setTimeout(() => this.appointments.set(current), 0);
  }
}
