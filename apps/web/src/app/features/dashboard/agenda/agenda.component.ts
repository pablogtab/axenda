import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentsService, Appointment } from '../../../core/services/appointments.service';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.css'
})
export class AgendaComponent implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  
  appointments: Appointment[] = [];
  hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 to 21:00
  currentDate = new Date();

  ngOnInit(): void {
    this.loadAppointments();
  }

  get filteredAppointments(): Appointment[] {
    return this.appointments.filter(app => {
      const appDate = new Date(app.startTime);
      return appDate.getUTCDate() === this.currentDate.getUTCDate() &&
             appDate.getUTCMonth() === this.currentDate.getUTCMonth() &&
             appDate.getUTCFullYear() === this.currentDate.getUTCFullYear();
    });
  }

  loadAppointments(): void {
    this.appointmentsService.findAll().subscribe(data => {
      this.appointments = data;
    });
  }

  nextDay(): void {
    this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() + 1));
  }

  prevDay(): void {
    this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() - 1));
  }

  setToday(): void {
    this.currentDate = new Date();
  }

  // Calcula la posición vertical (top) basada en la hora de inicio
  getTopPosition(startTime: string): string {
    const date = new Date(startTime);
    const startHour = 8; // El grid empieza a las 8
    const minutesFromStart = (date.getUTCHours() - startHour) * 60 + date.getUTCMinutes();
    return `${minutesFromStart * 1.5}px`; // 1.5px por minuto
  }

  // Calcula la altura basada en la duración (usando startTime y endTime)
  getHeight(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    return `${durationMinutes * 1.5}px`;
  }

  formatTime(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }
}
