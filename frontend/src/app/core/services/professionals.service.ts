import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  branchId?: string;
}

export interface AvailabilityException {
  id: string;
  type: 'HOLIDAY' | 'LEAVE' | 'BLOCK' | 'OTHER';
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface Professional {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  photoUrl?: string;
  color?: string;
  active: boolean;
  services?: { service: { id: string, name: string, active: boolean } }[];
  branches?: { branch: { id: string, name: string, active: boolean } }[];
  availability?: Availability[];
  exceptions?: AvailabilityException[];
}

@Injectable({
  providedIn: 'root'
})
export class ProfessionalsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/professionals`;

  search(query: string): Observable<Professional[]> {
    return this.http.get<Professional[]>(`${this.apiUrl}/search`, { params: { q: query } });
  }

  findAll(branchId?: string): Observable<Professional[]> {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    return this.http.get<Professional[]>(this.apiUrl, { params });
  }

  findOne(id: string): Observable<Professional> {
    return this.http.get<Professional>(`${this.apiUrl}/${id}`);
  }

  create(professional: any): Observable<Professional> {
    return this.http.post<Professional>(this.apiUrl, professional);
  }

  update(id: string, professional: any): Observable<Professional> {
    return this.http.patch<Professional>(`${this.apiUrl}/${id}`, professional);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  setBranches(id: string, branchIds: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/branches`, { ids: branchIds });
  }

  setServices(id: string, serviceIds: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/services`, { ids: serviceIds });
  }

  addAvailability(professionalId: string, data: any): Observable<Availability> {
    return this.http.post<Availability>(`${this.apiUrl}/${professionalId}/availability`, data);
  }

  removeAvailability(professionalId: string, availabilityId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${professionalId}/availability/${availabilityId}`);
  }

  // Excepciones
  addException(professionalId: string, data: any): Observable<AvailabilityException> {
    return this.http.post<AvailabilityException>(`${this.apiUrl}/${professionalId}/exceptions`, data);
  }

  removeException(professionalId: string, exceptionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${professionalId}/exceptions/${exceptionId}`);
  }
}
