import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isAuthRequest = req.url.includes('/auth/');

  let authReq = req;

  if (token && !isAuthRequest) {
    authReq = addToken(req, token);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const body = error.error;
      const errorCode = body?.errorCode || body?.error?.errorCode;
      const isExpired = error.status === 401 && errorCode === 'TOKEN_EXPIRED';

      if (isExpired && !isAuthRequest) {
        return handle401Error(req, next, authService);
      }

      return throwError(() => error);
    }),
  );
};

function addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        isRefreshing = false;

        const newToken = response?.data?.accessToken;
        if (!newToken) {
          authService.logout();
          return throwError(() => new Error('Refresh token response missing access token'));
        }

        refreshTokenSubject.next(newToken);
        return next(addToken(request, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.error(err);
        refreshTokenSubject = new BehaviorSubject<string | null>(null);

        authService.logout();
        return throwError(() => err);
      }),
    );
  }

  return refreshTokenSubject.pipe(
    filter((refreshToken) => refreshToken !== null),
    take(1),
    switchMap((refreshToken) => next(addToken(request, refreshToken!))),
  );
}
