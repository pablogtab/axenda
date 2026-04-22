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

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  appointments = signal<Appointment[]>([]);
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

  getAppointmentGridRange(app: Appointment): string {
    const start = new Date(app.startTime);
    const end = new Date(app.endTime);
    
    const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
    const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
    
    const startIndex = this.timeSlots().findIndex(s => s === startStr);
    const endIndex = this.timeSlots().findIndex(s => s === endStr);

    // Grid Row 1 is header. So row index starts at 2.
    // If not found (out of range), default to 1.
    const rowStart = startIndex !== -1 ? startIndex + 2 : 2;
    const rowEnd = endIndex !== -1 ? endIndex + 2 : rowStart + 1;

    return `${rowStart} / ${rowEnd}`;
  }

  getAppointmentsForProfessional(profId: string): Appointment[] {
    return this.appointments().filter(a => a.professional.id === profId);
  }

  openAppointmentForm(professional?: Professional, time?: string): void {
    console.log('Abrir formulario para:', professional?.firstName, time);
  }
}
