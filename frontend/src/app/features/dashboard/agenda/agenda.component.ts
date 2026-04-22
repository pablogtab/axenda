import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { ModalService } from '@services/modal.service';
import { forkJoin } from 'rxjs';
import { format, addDays, startOfDay, eachHourOfInterval, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html'
})
export class AgendaComponent implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private professionalsService = inject(ProfessionalsService);
  private branchesService = inject(BranchesService);
  private modal = inject(ModalService);

  // Estado
  selectedDate = signal<Date>(startOfDay(new Date()));
  selectedBranchId = signal<string | null>(null);
  
  professionals = signal<Professional[]>([]);
  appointments = signal<Appointment[]>([]);
  branches = signal<Branch[]>([]);
  isLoading = signal(true);

  // Configuración de la cuadrícula
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
    for (let hour = this.startHour; hour < this.endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
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
      }
    });
  }

  loadAppointments(): void {
    const dateStr = format(this.selectedDate(), 'yyyy-MM-dd');
    this.appointmentsService.findAll({ 
      startDate: dateStr, 
      endDate: dateStr,
      branchId: this.selectedBranchId() || undefined
    }).subscribe({
      next: (data) => {
        this.appointments.set(data);
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
  }

  onBranchChange(id: string): void {
    this.selectedBranchId.set(id);
    this.loadAppointments();
  }

  // Lógica para posicionar turnos
  getAppointmentStyle(app: Appointment) {
    const start = new Date(app.startTime);
    const end = new Date(app.endTime);
    
    const startMinutes = (start.getHours() - this.startHour) * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    // Cada slot de 30 min mide 60px en mi diseño
    const top = (startMinutes / 30) * 60;
    const height = (durationMinutes / 30) * 60;

    return {
      'top': `${top}px`,
      'height': `${height}px`,
      'background-color': `${app.service.color}20`,
      'border-left': `4px solid ${app.service.color}`,
      'color': app.service.color
    };
  }

  getAppointmentsForProfessional(profId: string): Appointment[] {
    return this.appointments().filter(a => a.professional.id === profId);
  }

  openAppointmentForm(professional?: Professional, time?: string): void {
    // TODO: Abrir modal de creación de turno
    console.log('Abrir formulario para:', professional?.firstName, time);
  }
}
