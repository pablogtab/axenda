import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PublicBookingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/p`;

  getAvailability(slug: string, params: { professionalId: string; serviceId: string; branchId: string; date: string; excludeAppointmentId?: string; invitationToken?: string }): Observable<{ time: string; available: boolean }[]> {
    return this.http.get<{ time: string; available: boolean }[]>(`${this.apiUrl}/${slug}/appointments/availability`, { params: params as any });
  }


  book(slug: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${slug}/appointments/book`, data);
  }

  getAppointmentByToken(token: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/appointments/${token}`);
  }

  cancelAppointment(token: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/public/appointments/${token}/cancel`, {});
  }

  rescheduleAppointment(token: string, startTime: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/public/appointments/${token}/reschedule`, { startTime });
  }

  validateInvitationToken(token: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/booking-invitations/public/validate/${token}`);
  }
}
