import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { TenantsService } from './tenants.service';

@Injectable({
  providedIn: 'root'
})
export class UserConfigurationService {
  private storage = inject(StorageService);
  private tenantsService = inject(TenantsService);

  // Signals para la configuración
  private _agendaZoom = signal<number>(1.0);
  private _agendaStartHour = signal<number>(8);
  private _agendaEndHour = signal<number>(21);
  private _agendaSelectedBranchId = signal<string | null>(null);
  private _agendaSelectedProfessionalIds = signal<string[]>([]);
  private _agendaView = signal<'day' | 'week' | 'month'>('day');
  private _agendaSelectedStatuses = signal<string[]>(['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW']);

  // Exponemos como readonly
  agendaZoom = this._agendaZoom.asReadonly();
  agendaStartHour = this._agendaStartHour.asReadonly();
  agendaEndHour = this._agendaEndHour.asReadonly();
  agendaSelectedBranchId = this._agendaSelectedBranchId.asReadonly();
  agendaSelectedProfessionalIds = this._agendaSelectedProfessionalIds.asReadonly();
  agendaView = this._agendaView.asReadonly();
  agendaSelectedStatuses = this._agendaSelectedStatuses.asReadonly();

  constructor() {
    // Efecto para cargar y persistir configuraciones basadas en el Tenant actual
    effect(() => {
      const tenantId = this.tenantsService.currentTenantId();
      if (!tenantId) return;

      // Al cambiar el tenantId, cargamos los valores del storage para este tenant
      this._agendaZoom.set(this.storage.get(`${tenantId}_agenda_zoom_level`, 1.0));
      this._agendaStartHour.set(this.storage.get(`${tenantId}_agenda_start_hour`, 8));
      this._agendaEndHour.set(this.storage.get(`${tenantId}_agenda_end_hour`, 21));
      this._agendaSelectedBranchId.set(this.storage.get(`${tenantId}_agenda_selected_branch_id`, null));
      this._agendaSelectedProfessionalIds.set(this.storage.get(`${tenantId}_agenda_selected_professional_ids`, []));
      this._agendaView.set(this.storage.get(`${tenantId}_agenda_view`, 'day'));
      this._agendaSelectedStatuses.set(this.storage.get(`${tenantId}_agenda_selected_statuses`, ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW']));
    });

    // Efecto para persistir automáticamente cuando cambian los valores
    effect(() => {
      const tenantId = this.tenantsService.currentTenantId();
      if (!tenantId) return;

      this.storage.set(`${tenantId}_agenda_zoom_level`, this._agendaZoom());
      this.storage.set(`${tenantId}_agenda_start_hour`, this._agendaStartHour());
      this.storage.set(`${tenantId}_agenda_end_hour`, this._agendaEndHour());
      this.storage.set(`${tenantId}_agenda_selected_branch_id`, this._agendaSelectedBranchId());
      this.storage.set(`${tenantId}_agenda_selected_professional_ids`, this._agendaSelectedProfessionalIds());
      this.storage.set(`${tenantId}_agenda_view`, this._agendaView());
      this.storage.set(`${tenantId}_agenda_selected_statuses`, this._agendaSelectedStatuses());
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
