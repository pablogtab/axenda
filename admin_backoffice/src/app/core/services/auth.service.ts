import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly accessTokenKey = 'axenda_admin_token';
  private readonly refreshTokenKey = 'axenda_admin_refresh_token';
  private readonly expiresAtKey = 'axenda_admin_expires_at';

  // Signals for reactive auth state
  isAuthenticated = signal<boolean>(!!this.getToken());

  getToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  login(email: string, password: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res?.data?.accessToken) {
            this.handleAuthentication(res.data);
            this.isAuthenticated.set(true);
          }
        })
      );
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<any>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap((res) => {
        if (res?.data?.accessToken) {
          this.handleAuthentication(res.data);
        }
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.expiresAtKey);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  private handleAuthentication(data: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
  }): void {
    localStorage.setItem(this.accessTokenKey, data.accessToken);

    if (data.refreshToken) {
      localStorage.setItem(this.refreshTokenKey, data.refreshToken);
    }

    if (data.expiresAt) {
      localStorage.setItem(this.expiresAtKey, data.expiresAt);
    }
  }
}
