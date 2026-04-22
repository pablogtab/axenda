import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

export interface ServiceCategory {
  id: string;
  name: string;
}

export interface BusinessService {
  id: string;
  name: string;
  description?: string;
  duration: number; // en minutos
  price?: number;
  color?: string;
  active: boolean;
  categoryId?: string;
  category?: ServiceCategory;
}

@Injectable({
  providedIn: 'root'
})
export class ServicesService {
  private http: HttpClient = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/services`;

  findAll(): Observable<BusinessService[]> {
    return this.http.get<{ data: BusinessService[] }>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  findAllCategories(): Observable<ServiceCategory[]> {
    return this.http.get<{ data: ServiceCategory[] }>(`${this.apiUrl}/categories`).pipe(
      map(response => response.data)
    );
  }

  findById(id: string): Observable<BusinessService> {
    return this.http.get<{ data: BusinessService }>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  create(service: Partial<BusinessService>): Observable<BusinessService> {
    return this.http.post<{ data: BusinessService }>(this.apiUrl, service).pipe(
      map(response => response.data)
    );
  }

  update(id: string, service: Partial<BusinessService>): Observable<BusinessService> {
    return this.http.patch<{ data: BusinessService }>(`${this.apiUrl}/${id}`, service).pipe(
      map(response => response.data)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
