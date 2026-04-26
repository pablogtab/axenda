import { HttpInterceptorFn, HttpErrorResponse, HttpResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, map, switchMap, take, throwError } from 'rxjs';

// Estado global para manejar múltiples peticiones 401 simultáneas
let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const isAuthRequest = req.url.includes('/auth/');
  
  let authReq = req;
  // Solo añadimos el token si lo tenemos y no es una petición de autenticación
  if (token && !isAuthRequest) {
    authReq = addToken(req, token);
  }

  // Acción preventiva: si el token está por expirar o ya expiró, refrescamos antes de la petición
  if (token && !isAuthRequest && authService.isTokenExpired()) {
    return handle401Error(req, next, authService);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el error es 401 y no es login, refresh o logout
      const isExcluded = req.url.includes('/auth/login') || 
                        req.url.includes('/auth/refresh') || 
                        req.url.includes('/auth/logout');

      if (error.status === 401 && !isExcluded) {
        return handle401Error(req, next, authService);
      }
      return throwError(() => error);
    }),
    map(event => {
      // Desenvolver el wrapper 'data' de la respuesta si existe
      // Se hace después del catchError para que aplique también a las peticiones reintentadas
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
    
    // Si el subject tenía un error de un intento fallido anterior, lo reseteamos
    if (refreshTokenSubject.hasError) {
      // No se puede resetear un BehaviorSubject que ha fallado, así que usamos next(null) 
      // si fuera posible, pero en realidad lo mejor es manejarlo con cuidado.
      // En Angular, los interceptores son funciones, pero las variables de módulo persisten.
    }
    
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
        // Notificar a otros que están esperando que el refresco falló
        const subjectToError = refreshTokenSubject;
        refreshTokenSubject = new BehaviorSubject<string | null>(null);
        subjectToError.error(err);
        
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
