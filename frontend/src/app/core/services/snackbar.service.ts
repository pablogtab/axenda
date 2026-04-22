import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'success' | 'error' | 'info' | 'warning';

export interface SnackbarMessage {
  id: number;
  message: string;
  type: SnackbarType;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private messages = signal<SnackbarMessage[]>([]);
  readonly snackbars = this.messages.asReadonly();
  private nextId = 0;

  show(message: string, type: SnackbarType = 'info', duration: number = 4000): void {
    const id = this.nextId++;
    const newMessage: SnackbarMessage = { id, message, type, duration };
    
    this.messages.update(prev => [...prev, newMessage]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  remove(id: number): void {
    this.messages.update(prev => prev.filter(m => m.id !== id));
  }
}
