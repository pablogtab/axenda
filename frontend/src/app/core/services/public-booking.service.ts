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

  getAvailability(slug: string, params: { professionalId: string; serviceId: string; branchId: string; date: string }): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${slug}/appointments/availability`, { params });
  }

  book(slug: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${slug}/appointments/book`, data);
  }
}
