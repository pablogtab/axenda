import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BranchesService {
  private http: HttpClient = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tenants/me/branches`;

  findAll(): Observable<Branch[]> {
    return this.http.get<{ data: Branch[] }>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  create(branch: Partial<Branch>): Observable<Branch> {
    return this.http.post<{ data: Branch }>(this.apiUrl, branch).pipe(
      map(response => response.data)
    );
  }

  update(id: string, branch: Partial<Branch>): Observable<Branch> {
    return this.http.patch<{ data: Branch }>(`${this.apiUrl}/${id}`, branch).pipe(
      map(response => response.data)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
