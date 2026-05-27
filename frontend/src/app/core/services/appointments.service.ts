import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, shareReplay, from, firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { QueryClient } from '@tanstack/angular-query-experimental';

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
  private queryClient = inject(QueryClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  invalidateCache() {
    this.queryClient.invalidateQueries({ queryKey: ['appointments'] });
  }

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

    return from(this.queryClient.fetchQuery({
      queryKey: ['appointments', filters],
      queryFn: () => firstValueFrom(this.http.get<Appointment[]>(this.apiUrl, { params })),
      staleTime: 1000 * 60 * 5, // 5 minutos de caché fresca
    }));
  }

  prefetch(filters: any): void {
    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.professionalId) params = params.set('professionalId', filters.professionalId);
    if (filters?.branchId) params = params.set('branchId', filters.branchId);
    if (filters?.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach((s: string) => params = params.append('statuses[]', s));
    }

    this.queryClient.prefetchQuery({
      queryKey: ['appointments', filters],
      queryFn: () => firstValueFrom(this.http.get<Appointment[]>(this.apiUrl, { params })),
      staleTime: 1000 * 60 * 5,
    });
  }

  findOne(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  create(appointment: any): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, appointment).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: string, appointment: any): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}`, appointment).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateStatus(id: string, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, { status }).pipe(
      tap(() => this.invalidateCache())
    );
  }

  cancel(id: string, notifyClient: boolean = true): Observable<void> {
    let params = new HttpParams().set('notifyClient', notifyClient.toString());
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { params }).pipe(
      tap(() => this.invalidateCache())
    );
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
