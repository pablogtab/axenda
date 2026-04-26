import { Injectable, signal, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class UserConfigurationService {
  private storage = inject(StorageService);

  // Signal para el zoom de la agenda
  private _agendaZoom = signal<number>(this.storage.get('agenda_zoom_level', 1.0));
  
  // Rango de horas de la agenda
  private _agendaStartHour = signal<number>(this.storage.get('agenda_start_hour', 8));
  private _agendaEndHour = signal<number>(this.storage.get('agenda_end_hour', 21));

  // Filtros de la agenda
  private _agendaSelectedBranchId = signal<string | null>(this.storage.get('agenda_selected_branch_id', null));
  private _agendaSelectedProfessionalIds = signal<string[]>(this.storage.get('agenda_selected_professional_ids', []));
  private _agendaView = signal<'day' | 'week' | 'month'>(this.storage.get('agenda_view', 'day'));
  private _agendaSelectedStatuses = signal<string[]>(this.storage.get('agenda_selected_statuses', ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW']));

  // Exponemos como readonly para fomentar el uso de setters
  agendaZoom = this._agendaZoom.asReadonly();
  agendaStartHour = this._agendaStartHour.asReadonly();
  agendaEndHour = this._agendaEndHour.asReadonly();
  agendaSelectedBranchId = this._agendaSelectedBranchId.asReadonly();
  agendaSelectedProfessionalIds = this._agendaSelectedProfessionalIds.asReadonly();
  agendaView = this._agendaView.asReadonly();
  agendaSelectedStatuses = this._agendaSelectedStatuses.asReadonly();

  constructor() {
    // Efecto para persistir automáticamente cualquier cambio en la configuración
    effect(() => {
      this.storage.set('agenda_zoom_level', this._agendaZoom());
      this.storage.set('agenda_start_hour', this._agendaStartHour());
      this.storage.set('agenda_end_hour', this._agendaEndHour());
      this.storage.set('agenda_selected_branch_id', this._agendaSelectedBranchId());
      this.storage.set('agenda_selected_professional_ids', this._agendaSelectedProfessionalIds());
      this.storage.set('agenda_view', this._agendaView());
      this.storage.set('agenda_selected_statuses', this._agendaSelectedStatuses());
    });
  }

  updateAgendaZoom(value: number): void {
    // Limitamos el zoom entre 1 y 2
    const safeValue = Math.max(1, Math.min(2, value));
    this._agendaZoom.set(safeValue);
  }

  updateAgendaHours(start: number, end: number): void {
    // Validaciones básicas
    if (start < 0) start = 0;
    if (end > 24) end = 24;
    if (start >= end) end = start + 1;
    
    this._agendaStartHour.set(start);
    this._agendaEndHour.set(end);
  }

  updateAgendaBranchId(id: string | null): void {
    this._agendaSelectedBranchId.set(id);
  }

  updateAgendaProfessionalIds(ids: string[]): void {
    this._agendaSelectedProfessionalIds.set(ids);
  }

  updateAgendaView(view: 'day' | 'week' | 'month'): void {
    this._agendaView.set(view);
  }

  updateAgendaStatuses(statuses: string[]): void {
    this._agendaSelectedStatuses.set(statuses);
  }
}
