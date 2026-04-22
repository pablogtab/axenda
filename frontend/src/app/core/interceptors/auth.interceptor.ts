import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, map, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Excluir endpoints de auth de la cabecera si ya tienen su lógica (como refresh)
  const isAuthRequest = req.url.includes('/auth/');
  
  let authReq = req;
  if (token && !isAuthRequest) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    map(event => {
      // Si la respuesta es exitosa (200-299) y tiene un wrapper 'data', lo desenvolvemos
      if (event instanceof HttpResponse && event.body && typeof event.body === 'object' && 'data' in event.body) {
        return event.clone({ body: event.body.data });
      }
      return event;
    }),
    catchError((error: HttpErrorResponse) => {
      // Si el error es 401 y no es una petición de login o refresh fallida
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        return authService.refreshToken().pipe(
          switchMap((response) => {
            // Reintentar la petición original con el nuevo token
            // Nota: Aquí 'response' ya viene "limpio" por el map de arriba si es exitoso
            const newToken = (response as any).accessToken || response;
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` }
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
