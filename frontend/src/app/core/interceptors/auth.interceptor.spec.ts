import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { of, throwError } from 'rxjs';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceMock: any;

  beforeEach(() => {
    authServiceMock = {
      getAccessToken: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header when token exists', () => {
    authServiceMock.getAccessToken.mockReturnValue('test-token');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should not add Authorization header for auth requests', () => {
    authServiceMock.getAccessToken.mockReturnValue('test-token');

    httpClient.get('/api/auth/login').subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('should handle 401 TOKEN_EXPIRED and refresh token', () => {
    authServiceMock.getAccessToken.mockReturnValue('expired-token');
    authServiceMock.refreshToken.mockReturnValue(of({ accessToken: 'new-token' }));

    httpClient.get('/api/test').subscribe(response => {
      expect(response).toBe('success');
    });

    // Initial request fails with 401 TOKEN_EXPIRED
    const req = httpMock.expectOne('/api/test');
    req.flush({ errorCode: 'TOKEN_EXPIRED' }, { status: 401, statusText: 'Unauthorized' });

    // Refresh token request should have happened
    expect(authServiceMock.refreshToken).toHaveBeenCalled();

    // Retried request should have new token
    const retryReq = httpMock.expectOne('/api/test');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
    retryReq.flush({ data: 'success' });
  });

  it('should unwrap data from response', () => {
    authServiceMock.getAccessToken.mockReturnValue('test-token');

    httpClient.get('/api/test').subscribe(response => {
      expect(response).toBe('actual-data');
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ data: 'actual-data' });
  });

  it('should logout if refresh token fails', () => {
    authServiceMock.getAccessToken.mockReturnValue('expired-token');
    authServiceMock.refreshToken.mockReturnValue(throwError(() => new Error('Refresh failed')));

    httpClient.get('/api/test').subscribe({
      error: (error) => {
        expect(authServiceMock.logout).toHaveBeenCalled();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ errorCode: 'TOKEN_EXPIRED' }, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.refreshToken).toHaveBeenCalled();
  });
});
