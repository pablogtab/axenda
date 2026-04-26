import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '@services/appointments.service';

@Component({
  selector: 'app-agenda-appointment-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda-appointment-card.component.html',
  styleUrls: ['./agenda-appointment-card.component.css']
})
export class AgendaAppointmentCardComponent {
  @Input({ required: true }) appointment!: Appointment;
  @Input() height: number = 0;
  @Input() showProfessionalBadge: boolean = false;

  // Mapeo de colores por estado
  statusInfo = computed(() => {
    const s = this.appointment.status;
    switch (s) {
      case 'CONFIRMED': return { color: 'bg-blue-400', label: 'Confirmado' };
      case 'COMPLETED': return { color: 'bg-purple-400', label: 'Finalizado' };
      case 'CANCELLED': return { color: 'bg-slate-500', label: 'Cancelado' };
      case 'NO_SHOW': return { color: 'bg-red-600', label: 'No asistió' };
      default: return { color: 'bg-amber-400', label: 'Reservado' };
    }
  });

  isCancelled = computed(() => ['CANCELLED', 'NO_SHOW'].includes(this.appointment.status));
}
