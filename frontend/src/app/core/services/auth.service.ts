import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  private readonly ACCESS_TOKEN_KEY = 'axenda_access_token';
  private readonly REFRESH_TOKEN_KEY = 'axenda_refresh_token';
  private readonly EXPIRES_AT_KEY = 'axenda_expires_at';
  
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  login(credentials: { email: string; password: string }): Observable<AuthData> {
    return this.http.post<AuthData>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(data => this.handleAuthentication(data))
    );
  }

  refreshToken(): Observable<AuthData> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token available'));

    return this.http.post<AuthData>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap(data => this.handleAuthentication(data)),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe();
    }
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
    this.isLoggedInSubject.next(false);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getExpiresAt(): string | null {
    return localStorage.getItem(this.EXPIRES_AT_KEY);
  }

  isTokenExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true;
    
    // Consideramos expirado si falta menos de 1 minuto para prevenir fallos en peticiones en curso
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    return now.getTime() > (expiryDate.getTime() - 60000);
  }

  private handleAuthentication(data: AuthData): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
    if (data.expiresAt) {
      localStorage.setItem(this.EXPIRES_AT_KEY, data.expiresAt);
    }
    this.isLoggedInSubject.next(true);
  }

  private hasToken(): boolean {
    return !!this.getAccessToken();
  }
}
