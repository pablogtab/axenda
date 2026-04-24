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

  // Podríamos mover parte de la lógica de visibilidad aquí como computeds si fuera necesario,
  // pero por ahora mantendremos la lógica dinámica en el template para facilidad de ajuste.
}
