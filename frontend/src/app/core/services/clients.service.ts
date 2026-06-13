import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CustomFieldValue } from './custom-fields.service';
import { BookingInvitation } from './booking-invitations.service';

export interface ClientTag {
  id: string;
  name: string;
  color?: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  document?: string;
  birthDate?: string;
  notes?: string;
  active: boolean;
  tags?: ClientTag[];
  fieldValues?: CustomFieldValue[];
  bookingInvitations?: BookingInvitation[];
}

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/clients`;

  findAll(
    page: number = 1,
    limit: number = 20,
    query?: string,
    fieldId?: string,
    fieldValue?: string,
  ): Observable<{ items: Client[], total: number }> {
    const params: any = { page: page.toString(), limit: limit.toString() };
    if (query) params.q = query;
    if (fieldId) params.fieldId = fieldId;
    if (fieldValue) params.fieldValue = fieldValue;
    return this.http.get<{ items: Client[], total: number }>(this.apiUrl, { params });
  }

  findOne(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  create(client: any): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }

  update(id: string, client: any): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}/${id}`, client);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
