import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthData {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http: HttpClient = inject(HttpClient);
  private readonly ACCESS_TOKEN_KEY = 'axenda_access_token';
  private readonly REFRESH_TOKEN_KEY = 'axenda_refresh_token';
  
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
    this.isLoggedInSubject.next(false);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private handleAuthentication(data: AuthData): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
    this.isLoggedInSubject.next(true);
  }

  private hasToken(): boolean {
    return !!this.getAccessToken();
  }
}
