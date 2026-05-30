import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/admin/auth';
  private readonly tokenKey = 'axenda_admin_token';

  // Signals for reactive auth state
  isAuthenticated = signal<boolean>(!!this.getToken());

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res?.data?.accessToken) {
            localStorage.setItem(this.tokenKey, res.data.accessToken);
            this.isAuthenticated.set(true);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.isAuthenticated.set(false);
  }
}
