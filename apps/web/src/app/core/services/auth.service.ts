import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly AUTH_KEY = 'axenda_token';
  
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        this.setToken(response.data.accessToken);
        this.isLoggedInSubject.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.AUTH_KEY);
    this.isLoggedInSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.AUTH_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.AUTH_KEY, token);
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }
}
