import { HttpInterceptorFn, HttpErrorResponse, HttpResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, map, switchMap, take, throwError } from 'rxjs';

/**
 * Global state to handle multiple simultaneous 401 requests
 */
let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Exclude auth endpoints from adding the token or handling refresh logic
  const isAuthRequest = req.url.includes('/auth/');
  
  let authReq = req;
  if (token && !isAuthRequest) {
    authReq = addToken(req, token);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if error is specifically 'TOKEN_EXPIRED' sent by the backend
      // With our backend exception filter, errorCode can be in body.errorCode or body.error.errorCode
      const body = error.error;
      const errorCode = body?.errorCode || body?.error?.errorCode;
      const isExpired = error.status === 401 && errorCode === 'TOKEN_EXPIRED';
      
      if (isExpired && !isAuthRequest) {
        return handle401Error(req, next, authService);
      }
      
      return throwError(() => error);
    }),
    map(event => {
      // Unwrap backend 'data' wrapper if present.
      // This happens AFTER catchError, ensuring retried requests are also unwrapped.
      if (
        event instanceof HttpResponse && 
        event.body !== null && 
        typeof event.body === 'object' && 
        'data' in event.body
      ) {
        return event.clone({ body: event.body.data });
      }
      return event;
    })
  );
};

/**
 * Adds the Authorization header to the request
 */
function addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

/**
 * Handles 401 errors by refreshing the token and retrying the request
 */
function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        isRefreshing = false;
        
        // The response is already unwrapped by the interceptor's map
        // so response is the actual AuthData object
        const newToken = response.accessToken;
        refreshTokenSubject.next(newToken);
        
        return next(addToken(request, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        // Notificamos error a todas las peticiones que estaban esperando para que no se queden colgadas
        refreshTokenSubject.error(err);
        // Reiniciamos el subject para futuras peticiones después del fallo
        refreshTokenSubject = new BehaviorSubject<string | null>(null);
        
        authService.logout();
        return throwError(() => err);
      })
    );
  } else {
    // If a refresh is already in progress, wait for the new token
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next(addToken(request, token!)))
    );
  }
}
