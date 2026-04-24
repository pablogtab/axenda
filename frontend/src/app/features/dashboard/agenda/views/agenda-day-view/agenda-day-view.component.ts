import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, ElementRef, OnInit, OnDestroy, effect, HostListener, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { Professional } from '@services/professionals.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { SnackbarService } from '@services/snackbar.service';
import { startOfLocalDate, endOfLocalDate, createLocalDate } from '@core/utils/date-utils';
import { AgendaZoomDirective } from '../../directives/agenda-zoom.directive';
import { AgendaTimeIndicatorComponent } from '../../components/agenda-time-indicator/agenda-time-indicator.component';
import { AgendaAppointmentCardComponent } from '../../components/agenda-appointment-card/agenda-appointment-card.component';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
}

@Component({
  selector: 'app-agenda-day-view',
  standalone: true,
  imports: [CommonModule, DragDropModule, AgendaZoomDirective, AgendaTimeIndicatorComponent, AgendaAppointmentCardComponent],
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
export class AgendaDayViewComponent implements OnChanges, OnInit, OnDestroy {
  private appointmentsService = inject(AppointmentsService);
  private userConfig = inject(UserConfigurationService);
  private snackbarService = inject(SnackbarService);
  private el = inject(ElementRef);

  date = input.required<Date>();
  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];

  @Output() addAppointment = new EventEmitter<{ professional: Professional, time: string }>();
  @Output() editAppointment = new EventEmitter<{ appointment: Appointment, newDate?: Date }>();

  rawAppointments = signal<Appointment[]>([]);
  private zoomLevel = this.userConfig.agendaZoom;
  private startHour = this.userConfig.agendaStartHour;
  private endHour = this.userConfig.agendaEndHour;
  
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

  formattedDate = computed(() => {
    return format(this.date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  });

  containerHeight = signal(0);
  isLoading = signal(false);
  isDragging = signal(false);
  hoveredSlot = signal<string | null>(null);
  draggedApp = signal<AppointmentUI | null>(null);
  dropPreview = signal<{ professionalId: string, top: number, height: number } | null>(null);

  private resizeObserver: ResizeObserver | null = null;

  slotHeight = computed(() => {
    const h = this.containerHeight();
    const slots = this.timeSlots().length;
    if (h === 0 || slots === 0) return 25;

    // Header is 40px
    const availableHeight = h - 40;
    return (availableHeight / slots) * this.zoomLevel();
  });

  appointments = computed(() => {
    const height = this.slotHeight();
    const slots = this.timeSlots();

    return this.rawAppointments().map(app => {
      const start = new Date(app.startTime);
      const end = new Date(app.endTime);
      const startStr = format(start, 'HH:mm');
      const startIndex = slots.findIndex(s => s === startStr);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);



      return {
        ...app,
        top: startIndex !== -1 ? startIndex * height : 0,
        height: (duration * height) / 15
      } as AppointmentUI;
    });
  });

  private dayChangeTimeout: any;
  private originalDate: Date | null = null;
  @Output() dateChange = new EventEmitter<Date>();
  private dragCancelled = false;

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: any) {
    if (this.isDragging()) {
      this.dragCancelled = true;
      // Despachamos un evento de mouseup para forzar a CDK a terminar el arrastre
      document.dispatchEvent(new MouseEvent('mouseup'));

      const app = this.draggedApp();

      // Si la fecha cambió durante el arrastre, la revertimos
      if (this.originalDate && this.originalDate.getTime() !== this.date().getTime()) {
        this.dateChange.emit(this.originalDate);
      }

      // Usamos setTimeout para evitar errores de ExpressionChangedAfterItHasBeenChecked
      // al modificar el estado de dragging mientras CDK aún está procesando eventos
      setTimeout(() => {
        this.finishDrag();
        if (app) this.refreshUI(app);
      }, 0);
    }
  }

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

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] || changes['branchId'] || changes['professionals']) {
      this.loadAppointments();
      this.computeGridStatus();
    }
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
    const startDate = startOfLocalDate(this.date()).toISOString();
    const endDate = endOfLocalDate(this.date()).toISOString();

    console.log(`[Agenda] Cargando turnos desde ${startDate} hasta ${endDate} en sucursal ${this.branchId}`);
    
    this.appointmentsService.findAll({ 
      startDate, 
      endDate,
      branchId: this.branchId
    }).subscribe({
      next: (data) => {
        // Usamos setTimeout para sacar la actualización del ciclo actual de detección
        // de cambios y evitar conflictos con las manipulaciones del DOM de CDK.
        setTimeout(() => {
          const currentDragged = this.draggedApp();
          
          let finalData = [...data];
          // Si estamos arrastrando, nos aseguramos de que el turno persistente
          // esté en la lista, pero solo si no vino ya en la nueva data
          if (currentDragged && !finalData.find(a => a.id === currentDragged.id)) {
            // Lo insertamos al principio para que Angular tenga una referencia más estable
            finalData.unshift(currentDragged);
          }

          this.rawAppointments.set(finalData);
          this.isLoading.set(false);
        }, 0);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onDragStarted(app: AppointmentUI): void {
    this.isDragging.set(true);
    this.draggedApp.set(app);
    this.originalDate = new Date(this.date());
    this.dragCancelled = false;
  }

  onDragEnded(): void {
    // Delay para permitir que onDrop lea el preview antes de limpiar
    // y evitar errores de ExpressionChangedAfterItHasBeenChecked
    setTimeout(() => {
      if (this.isDragging()) {
        this.finishDrag();
      }
    }, 100);
  }

  onCellHover(prof: Professional, slot: string): void {
    if (!this.isDragging() || !this.draggedApp()) return;
    
    const startIndex = this.timeSlots().findIndex(s => s === slot);
    if (startIndex === -1) return;

    const newPreview = {
      professionalId: prof.id,
      top: startIndex * this.slotHeight(),
      height: this.draggedApp()?.height || 0
    };

    if (JSON.stringify(this.dropPreview()) !== JSON.stringify(newPreview)) {
      this.dropPreview.set(newPreview);
    }
  }

  onCellEnter(slot: string): void {
    this.hoveredSlot.set(slot);
  }

  onCellLeave(): void {
    this.hoveredSlot.set(null);
  }

  onZoneEnter(direction: 'prev' | 'next'): void {
    if (!this.isDragging()) return;
    this.clearDayChangeTimer();
    this.startDayChangeTimer(direction);
  }

  private startDayChangeTimer(direction: 'prev' | 'next'): void {
    this.dayChangeTimeout = setTimeout(() => {
      if (!this.isDragging()) return;

      const newDate = new Date(this.date());
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
    const dayOfWeek = this.date().getDay();
    const isOut = prof.exceptions?.some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      const current = startOfDay(this.date());
      return current >= start && current <= end && (ex.type === 'HOLIDAY' || ex.type === 'LEAVE');
    });
    if (isOut) return false;

    const blocks = prof.availability?.filter(a => a.dayOfWeek === dayOfWeek) || [];
    return blocks.some(b => slot >= b.startTime && slot < b.endTime);
  }

  isProfessionalBlockedAt(prof: Professional, slot: string): boolean {
    const current = startOfDay(this.date());
    return (prof.exceptions || []).some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      return current >= start && current <= end && ex.type === 'BLOCK' && ex.startTime && ex.endTime && slot >= ex.startTime && slot < ex.endTime;
    });
  }

  onDrop(event: CdkDragDrop<any[]>): void {
    if (this.dragCancelled) {
      this.dragCancelled = false;
      return;
    }
    const app = event.item.data;
    const preview = this.dropPreview();
    
    if (!preview) {
      this.handleFailedDrop(app);
      this.finishDrag();
      return;
    }

    const newProfessionalId = preview.professionalId;
    const newIndex = Math.round(preview.top / this.slotHeight());
    const newTimeStr = this.timeSlots()[newIndex];

    if (!this.availabilityMap()[`${newProfessionalId}-${newTimeStr}`]) {
      this.handleFailedDrop(app);
      this.finishDrag();
      return;
    }

    const originalDuration = new Date(app.endTime).getTime() - new Date(app.startTime).getTime();
    const dateStr = format(this.date(), 'yyyy-MM-dd');
    const newStartTime = createLocalDate(dateStr, newTimeStr);
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    this.rawAppointments.update(apps => apps.map(a => 
      a.id === app.id ? { 
        ...a, 
        professional: { ...a.professional, id: newProfessionalId },
        professionalId: newProfessionalId,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString()
      } : a
    ));

    // Aplicamos el efecto de desaparición/aparición para forzar a CDK a resetearse
    this.refreshUI(app);

    this.appointmentsService.update(app.id, {
      professionalId: newProfessionalId,
      startTime: newStartTime.toISOString()
    }).subscribe({
      error: () => this.loadAppointments()
    });

    this.finishDrag();
  }

  private finishDrag(): void {
    // Usamos setTimeout para sacar la actualización del ciclo actual de detección
    // de cambios y evitar conflictos con las manipulaciones del DOM de CDK,
    // previniendo el error ExpressionChangedAfterItHasBeenCheckedError.
    setTimeout(() => {
      this.isDragging.set(false);
      this.draggedApp.set(null);
      this.dropPreview.set(null);
      this.originalDate = null;
      this.clearDayChangeTimer();
    }, 0);
  }

  private handleFailedDrop(app: Appointment): void {
    this.snackbarService.warning('El profesional no está disponible en este horario o zona.');
    if (this.originalDate && this.originalDate.getTime() !== this.date().getTime()) {
      this.dateChange.emit(this.originalDate);
    }
    this.refreshUI(app);
  }

  private refreshUI(app: Appointment): void {
    const current = this.rawAppointments();
    this.rawAppointments.set(current.filter(a => a.id !== app.id));
    setTimeout(() => this.rawAppointments.set(current), 0);
  }

  onZoneClick(direction: 'prev' | 'next'): void {
    const newDate = new Date(this.date());
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    this.dateChange.emit(newDate);
  }
}
