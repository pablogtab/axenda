import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

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
}

@Injectable({
  providedIn: 'root'
})
export class ProfessionalsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/professionals`;

  findAll(): Observable<Professional[]> {
    return this.http.get<{ data: Professional[] }>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  findById(id: string): Observable<Professional> {
    return this.http.get<{ data: Professional }>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  create(professional: Partial<Professional>): Observable<Professional> {
    return this.http.post<{ data: Professional }>(this.apiUrl, professional).pipe(
      map(response => response.data)
    );
  }

  update(id: string, professional: Partial<Professional>): Observable<Professional> {
    return this.http.patch<{ data: Professional }>(`${this.apiUrl}/${id}`, professional).pipe(
      map(response => response.data)
    );
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
}
