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
  document?: string;
  notes?: string;
  photoUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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

  create(client: Partial<Client>): Observable<Client> {
    return this.http.post<{ data: Client }>(this.apiUrl, client).pipe(
      map(response => response.data)
    );
  }

  update(id: string, client: Partial<Client>): Observable<Client> {
    return this.http.patch<{ data: Client }>(`${this.apiUrl}/${id}`, client).pipe(
      map(response => response.data)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

