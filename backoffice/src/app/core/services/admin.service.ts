import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ─── Metrics ────────────────────────────────────────────────────────────────
  getMetrics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/metrics`);
  }

  // ─── Tenants ────────────────────────────────────────────────────────────────
  getTenants(search?: string, page = 1, limit = 10): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<any>(`${this.apiUrl}/tenants`, { params });
  }

  overrideSubscription(tenantId: string, subscriptionData: {
    planCode: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    status: string;
    endDate: string | null;
  }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tenants/${tenantId}/subscription`, subscriptionData);
  }

  searchUsers(search: string): Observable<any> {
    const params = new HttpParams().set('search', search);
    return this.http.get<any>(`${this.apiUrl}/users`, { params });
  }

  // ─── Coupons ────────────────────────────────────────────────────────────────
  getCoupons(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/coupons`);
  }

  createCoupon(coupon: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/coupons`, coupon);
  }

  updateCoupon(id: string, coupon: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/coupons/${id}`, coupon);
  }

  deleteCoupon(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/coupons/${id}`);
  }
}
