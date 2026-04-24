import { Injectable, signal } from '@angular/core';
import { Appointment } from '@services/appointments.service';

@Injectable({
  providedIn: 'root'
})
export class AgendaService {
  isDragging = signal(false);
  draggedApp = signal<Appointment | null>(null);

  setDragging(isDragging: boolean, app: Appointment | null = null) {
    this.isDragging.set(isDragging);
    this.draggedApp.set(app);
  }

  stopDragging() {
    this.isDragging.set(false);
    this.draggedApp.set(null);
  }
}
