import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BookingInvitationSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface BookingInvitation {
  id: string;
  token: string;
  description?: string;
  active: boolean;
  usesCount: number;
  maxUses?: number;
  expiresAt?: string;
  startDate?: string;
  endDate?: string;
  schedule: BookingInvitationSchedule[];
  branchId?: string;
  professionalId?: string;
  clientId?: string;
  branch?: { id: string; name: string };
  professional?: { id: string; firstName: string; lastName: string };
  client?: { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingInvitationsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/booking-invitations`;

  create(dto: {
    description?: string;
    maxUses?: number;
    expiresAt?: string;
    startDate?: string;
    endDate?: string;
    schedule: BookingInvitationSchedule[];
    branchId?: string;
    professionalId?: string;
    clientId?: string;
  }): Observable<BookingInvitation> {
    return this.http.post<BookingInvitation>(this.apiUrl, dto);
  }

  findAll(): Observable<BookingInvitation[]> {
    return this.http.get<BookingInvitation[]>(this.apiUrl);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
