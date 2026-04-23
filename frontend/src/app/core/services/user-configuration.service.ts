import { Injectable, signal, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class UserConfigurationService {
  private storage = inject(StorageService);

  // Signal para el zoom de la agenda
  private _agendaZoom = signal<number>(this.storage.get('agenda_zoom_level', 1.0));
  
  // Exponemos como readonly para fomentar el uso de setters
  agendaZoom = this._agendaZoom.asReadonly();

  constructor() {
    // Efecto para persistir automáticamente cualquier cambio en la configuración
    effect(() => {
      this.storage.set('agenda_zoom_level', this._agendaZoom());
    });
  }

  updateAgendaZoom(value: number): void {
    // Limitamos el zoom entre 1 y 5 como acordamos previamente
    const safeValue = Math.max(1, Math.min(2, value));
    this._agendaZoom.set(safeValue);
  }
}
