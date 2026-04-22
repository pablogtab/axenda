import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface BusinessService {
  id: string;
  name: string;
  description?: string;
  duration: number; // en minutos
  price: number;
  color?: string;
  active: boolean;
  categoryId?: string;
  category?: { id: string, name: string };
}

export interface ServiceCategory {
  id: string;
  name: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ServicesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/services`;

  findAll(): Observable<BusinessService[]> {
    return this.http.get<BusinessService[]>(this.apiUrl);
  }

  findOne(id: string): Observable<BusinessService> {
    return this.http.get<BusinessService>(`${this.apiUrl}/${id}`);
  }

  create(service: any): Observable<BusinessService> {
    return this.http.post<BusinessService>(this.apiUrl, service);
  }

  update(id: string, service: any): Observable<BusinessService> {
    return this.http.patch<BusinessService>(`${this.apiUrl}/${id}`, service);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Categorías
  findAllCategories(): Observable<ServiceCategory[]> {
    return this.http.get<ServiceCategory[]>(`${this.apiUrl}/categories`);
  }
}
