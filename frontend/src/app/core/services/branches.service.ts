import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tenants/me/branches`;

  findAll(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.apiUrl);
  }

  create(branch: any): Observable<Branch> {
    return this.http.post<Branch>(this.apiUrl, branch);
  }

  update(id: string, branch: any): Observable<Branch> {
    return this.http.patch<Branch>(`${this.apiUrl}/${id}`, branch);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
