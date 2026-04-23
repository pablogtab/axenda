import { HttpInterceptorFn, HttpErrorResponse, HttpResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, map, switchMap, take, throwError } from 'rxjs';

// Estado global para manejar múltiples peticiones 401 simultáneas
let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const isAuthRequest = req.url.includes('/auth/');
  
  let authReq = req;
  // Solo añadimos el token si lo tenemos y no es una petición de autenticación
  if (token && !isAuthRequest) {
    authReq = addToken(req, token);
  }

  return next(authReq).pipe(
    map(event => {
      // Desenvolver el wrapper 'data' de la respuesta si existe
      if (event instanceof HttpResponse && event.body && typeof event.body === 'object' && 'data' in event.body) {
        return event.clone({ body: event.body.data });
      }
      return event;
    }),
    catchError((error: HttpErrorResponse) => {
      // Si el error es 401 y no es login o el propio refresh
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        return handle401Error(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Añade el token de autorización a la cabecera
 */
function addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

/**
 * Maneja el error 401 renovando el token o esperando a que otra petición lo renueve
 */
function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        isRefreshing = false;
        // El response ya viene "limpio" (unwrapped) por el map del interceptor
        const newToken = response.accessToken || response;
        refreshTokenSubject.next(newToken);
        return next(addToken(request, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  } else {
    // Si ya hay un refresh en curso, esperamos a que termine
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next(addToken(request, token!)))
    );
  }
}
