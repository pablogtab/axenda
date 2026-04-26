import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  internalNotes?: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  service: {
    id: string;
    name: string;
    duration: number;
    color: string;
    price: number;
  };
  professional: {
    id: string;
    firstName: string;
    lastName: string;
    color: string;
  };
  branch: {
    id: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private http: HttpClient = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  findAll(filters?: { 
    startDate?: string; 
    endDate?: string; 
    professionalId?: string; 
    branchId?: string; 
    statuses?: string[];
  }): Observable<Appointment[]> {
    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.professionalId) params = params.set('professionalId', filters.professionalId);
    if (filters?.branchId) params = params.set('branchId', filters.branchId);
    if (filters?.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach(s => params = params.append('statuses[]', s));
    }

    return this.http.get<Appointment[]>(this.apiUrl, { params });
  }

  findOne(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  create(appointment: any): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, appointment);
  }

  update(id: string, appointment: any): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}`, appointment);
  }

  updateStatus(id: string, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, { status });
  }

  cancel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getAvailability(params: {
    date: string;
    professionalId: string;
    serviceId: string;
  }): Observable<string[]> {
    let httpParams = new HttpParams()
      .set('date', params.date)
      .set('professionalId', params.professionalId)
      .set('serviceId', params.serviceId);

    return this.http.get<string[]>(`${this.apiUrl}/availability`, { params: httpParams });
  }
}
