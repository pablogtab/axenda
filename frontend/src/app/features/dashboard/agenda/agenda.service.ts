import { Injectable, signal } from '@angular/core';
import { Appointment } from '@services/appointments.service';

@Injectable({
  providedIn: 'root'
})
export class AgendaService {
  isDragging = signal(false);
  isNavigating = signal(false);
  draggedApp = signal<Appointment | null>(null);
  draggedAppHeight = signal<number>(0);
  draggedAppWidth = signal<number>(0);
  draggedAppOriginDate = signal<Date | null>(null);
  
  // Track mouse position for custom drag preview
  mouseX = signal(0);
  mouseY = signal(0);

  setDragging(isDragging: boolean, app: Appointment | null = null, height: number = 0, width: number = 0, originDate: Date | null = null) {
    this.isDragging.set(isDragging);
    this.draggedApp.set(app);
    this.draggedAppHeight.set(height);
    this.draggedAppWidth.set(width);
    this.draggedAppOriginDate.set(originDate);
  }

  updateMousePosition(x: number, y: number) {
    this.mouseX.set(x);
    this.mouseY.set(y);
  }

  stopDragging() {
    this.isDragging.set(false);
    this.draggedApp.set(null);
    this.draggedAppHeight.set(0);
    this.draggedAppWidth.set(0);
    this.draggedAppOriginDate.set(null);
  }

  triggerNavigationFeedback() {
    this.isNavigating.set(true);
    setTimeout(() => this.isNavigating.set(false), 500);
  }
}
