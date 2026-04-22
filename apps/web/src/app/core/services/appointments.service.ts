import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  client: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  service: {
    name: string;
    duration: number;
    color: string;
    price: number;
  };
  professional: {
    firstName: string;
    lastName: string;
    color: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  findAll(): Observable<Appointment[]> {
    return this.http.get<{ data: Appointment[] }>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status });
  }

  // Futuro: getAvailability, create, delete, etc.
}
