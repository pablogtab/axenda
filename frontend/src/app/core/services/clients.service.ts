import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClientTag {
  id: string;
  name: string;
  color: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  active: boolean;
  tags: ClientTag[];
  _count?: {
    appointments: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private http: HttpClient = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/clients`;

  findAll(): Observable<Client[]> {
    return this.http.get<{ data: Client[] }>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  findById(id: string): Observable<Client> {
    return this.http.get<{ data: Client }>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  // Futuro: create, update, delete
}
