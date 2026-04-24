import { Injectable, signal } from '@angular/core';
import { Appointment } from '@services/appointments.service';

@Injectable({
  providedIn: 'root'
})
export class AgendaService {
  isDragging = signal(false);
  isNavigating = signal(false);
  draggedApp = signal<Appointment | null>(null);
  
  // Track mouse position for custom drag preview
  mouseX = signal(0);
  mouseY = signal(0);

  setDragging(isDragging: boolean, app: Appointment | null = null) {
    this.isDragging.set(isDragging);
    this.draggedApp.set(app);
  }

  updateMousePosition(x: number, y: number) {
    this.mouseX.set(x);
    this.mouseY.set(y);
  }

  stopDragging() {
    this.isDragging.set(false);
    this.draggedApp.set(null);
  }

  triggerNavigationFeedback() {
    this.isNavigating.set(true);
    setTimeout(() => this.isNavigating.set(false), 500);
  }
}
