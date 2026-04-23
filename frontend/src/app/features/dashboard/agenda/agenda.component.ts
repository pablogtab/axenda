import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ModalService } from '@services/modal.service';
import { forkJoin } from 'rxjs';
import { format, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private professionalsService = inject(ProfessionalsService);
  private branchesService = inject(BranchesService);
  private modal = inject(ModalService);

  selectedDate = signal<Date>(startOfDay(new Date()));
  selectedBranchId = signal<string | null>(null);
  
  professionals = signal<Professional[]>([]);
  appointments = signal<AppointmentUI[]>([]);
  
  // Optimización: Mapa de turnos por profesional para evitar filtros en el template
  appointmentsByProfessional = computed(() => {
    const map = new Map<string, AppointmentUI[]>();
    this.appointments().forEach(app => {
      const list = map.get(app.professional.id) || [];
      list.push(app);
      map.set(app.professional.id, list);
    });
    return map;
  });

  // Optimización Extrema: Disponibilidad pre-calculada por (profId, slot)
  availabilityMap = signal<Record<string, boolean>>({});
  blockedMap = signal<Record<string, boolean>>({});
  isDragging = signal(false);

  branches = signal<Branch[]>([]);
  isLoading = signal(true);

  timeSlots = signal<string[]>([]);
  startHour = 8;
  endHour = 21;

  formattedDate = computed(() => {
    const date = this.selectedDate();
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  });

  ngOnInit(): void {
    this.generateTimeSlots();
    this.loadInitialData();
  }

  generateTimeSlots(): void {
    const slots: string[] = [];
    // Slots cada 15 minutos para mayor precisión en el Grid
    for (let hour = this.startHour; hour < this.endHour; hour++) {
      for (let min of ['00', '15', '30', '45']) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min}`);
      }
    }
    this.timeSlots.set(slots);
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    forkJoin({
      branches: this.branchesService.findAll(),
      professionals: this.professionalsService.findAll()
    }).subscribe({
      next: (res) => {
        this.branches.set(res.branches.filter(b => b.active));
        this.professionals.set(res.professionals.filter(p => p.active));
        if (this.branches().length > 0 && !this.selectedBranchId()) {
          this.selectedBranchId.set(this.branches()[0].id);
        }
        this.loadAppointments();
        this.computeGridStatus();
      }
    });
  }

  computeGridStatus(): void {
    const avail: Record<string, boolean> = {};
    const block: Record<string, boolean> = {};

    this.professionals().forEach(prof => {
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
    const dateStr = format(this.selectedDate(), 'yyyy-MM-dd');
    this.appointmentsService.findAll({ 
      startDate: dateStr, 
      endDate: dateStr,
      branchId: this.selectedBranchId() || undefined
    }).subscribe({
      next: (data) => {
        // Pre-calcular posiciones para evitar cálculos en el template
        const uiAppointments: AppointmentUI[] = data.map(app => {
          const start = new Date(app.startTime);
          const end = new Date(app.endTime);
          const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
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

  today(): Date {
    return startOfDay(new Date());
  }

  changeDate(days: number): void {
    this.selectedDate.set(addDays(this.selectedDate(), days));
    this.loadAppointments();
    this.computeGridStatus();
  }

  onBranchChange(id: string): void {
    this.selectedBranchId.set(id);
    this.loadAppointments();
    this.computeGridStatus();
  }

  // ─── Lógica de Grid ────────────────────────────────────────────────────────

  isProfessionalAvailableAt(prof: Professional, slot: string): boolean {
    const dayOfWeek = this.selectedDate().getDay();
    
    // 1. Full day check
    const isOut = prof.exceptions?.some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      const current = startOfDay(this.selectedDate());
      return current >= start && current <= end && (ex.type === 'HOLIDAY' || ex.type === 'LEAVE' || (ex.type === 'BLOCK' && !ex.startTime));
    });
    if (isOut) return false;

    // 2. Schedule check
    const blocks = prof.availability?.filter(a => a.dayOfWeek === dayOfWeek) || [];
    return blocks.some(b => slot >= b.startTime && slot < b.endTime);
  }

  isProfessionalBlockedAt(prof: Professional, slot: string): boolean {
    const current = startOfDay(this.selectedDate());
    return (prof.exceptions || []).some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      return current >= start && current <= end && ex.type === 'BLOCK' && ex.startTime && ex.endTime && slot >= ex.startTime && slot < ex.endTime;
    });
  }

  getAppointmentsForProfessional(profId: string): AppointmentUI[] {
    return this.appointments().filter(a => a.professional.id === profId);
  }

  openAppointmentForm(professional?: Professional, time?: string): void {
    console.log('Abrir formulario para:', professional?.firstName, time);
  }

  onDrop(event: CdkDragDrop<any>): void {
    const app = event.item.data as Appointment;
    const newProfessionalId = event.container.id;
    const prevProfessionalId = event.previousContainer.id;
    
    console.log('--- DROP EVENT ---');
    console.log('Appointment:', app.id);
    console.log('From Container:', prevProfessionalId);
    console.log('To Container:', newProfessionalId);
    console.log('Is same container?', prevProfessionalId === newProfessionalId);
    
    // 1. Calcular el desplazamiento en filas (25px por slot)
    const rowsMoved = Math.round(event.distance.y / 25);
    console.log('Rows moved:', rowsMoved);
    
    // 2. Encontrar la hora original y calcular la nueva
    const start = new Date(app.startTime);
    const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
    const startIndex = this.timeSlots().findIndex(s => s === startStr);
    console.log('Start Time Original:', startStr, 'Index:', startIndex);
    
    const newIndex = startIndex + rowsMoved;
    console.log('New Index Target:', newIndex);
    
    if (newIndex < 0 || newIndex >= this.timeSlots().length) {
      console.error('!!! RECHAZADO: Fuera de límites');
      const currentApps = this.appointments();
      // 1. Lo quitamos de la lista momentáneamente
      this.appointments.set(currentApps.filter(a => a.id !== app.id));
      // 2. Lo volvemos a poner en el siguiente tick (esto destruye y recrea el elemento en el DOM)
      setTimeout(() => this.appointments.set(currentApps.map(a => ({...a}))), 0);
      return;
    }

    const newTimeStr = this.timeSlots()[newIndex];
    console.log('New Time Str:', newTimeStr);

    // --- VALIDACIÓN DE DISPONIBILIDAD ---
    const availabilityKey = `${newProfessionalId}-${newTimeStr}`;
    const isAvailable = this.availabilityMap()[availabilityKey];
    console.log('Availability Check Key:', availabilityKey, 'Result:', isAvailable);

    if (!isAvailable) {
      console.warn('!!! RECHAZADO: Zona no disponible');
      const currentApps = this.appointments();
      this.appointments.set(currentApps.filter(a => a.id !== app.id));
      setTimeout(() => this.appointments.set(currentApps.map(a => ({...a}))), 0);
      return;
    }

    const [hours, mins] = newTimeStr.split(':').map(Number);
    console.log('Confirmed Drop at:', hours, ':', mins);
    
    const newStartTime = new Date(this.selectedDate());
    newStartTime.setHours(hours, mins, 0, 0);

    // 3. Actualización Optimista (UI Instantánea)
    const originalAppointments = this.appointments();
    const updatedAppointments = originalAppointments.map(a => {
      if (a.id === app.id) {
        return {
          ...a,
          professional: { ...a.professional, id: newProfessionalId },
          startTime: newStartTime.toISOString(),
          top: newIndex * 25 // Actualizamos el TOP instantáneamente
        };
      }
      return a;
    });
    
    this.appointments.set(updatedAppointments);

    // 4. Sincronizar con el backend en segundo plano
    this.appointmentsService.update(app.id, {
      professionalId: newProfessionalId,
      startTime: newStartTime.toISOString()
    }).subscribe({
      next: () => {
        // Recargamos para asegurar que todo esté sincronizado (opcional, pero seguro)
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Error al mover turno:', err);
        // Revertir en caso de error
        this.appointments.set(originalAppointments);
        alert('No se pudo mover el turno. Reintentando...');
      }
    });
  }
}
