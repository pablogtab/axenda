import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  onboardingCompleted: boolean;
  publicSlug?: string;
  mode: string;
  timezone: string;
  currency: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  primaryHoverColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  address?: string;
  active: boolean;
  publicShowBranchSelection?: boolean;
  publicShowProfessionalSelection?: boolean;
  publicMaxOverlapMins?: number;
  publicMaxBookingDays?: number;
  publicMinBookingTime?: string;
  services?: any[];
  branches?: any[];
}

export interface UpdateTenantDto {
  name?: string;
  publicSlug?: string;
  mode?: string;
  timezone?: string;
  currency?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  primaryHoverColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  publicShowBranchSelection?: boolean;
  publicShowProfessionalSelection?: boolean;
  publicMaxOverlapMins?: number;
  publicMaxBookingDays?: number;
  publicMinBookingTime?: string;
  onboardingCompleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TenantsService {
  private http = inject(HttpClient);

  getMe(): Observable<Tenant> {
    return this.http.get<Tenant>(`${environment.apiUrl}/tenants/me`);
  }

  getPublicInfo(slug: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${environment.apiUrl}/p/${slug}`);
  }

  checkSlugAvailability(slug: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(`${environment.apiUrl}/p/check-availability/${slug}`);
  }

  updateMe(dto: UpdateTenantDto): Observable<Tenant> {
    return this.http.patch<Tenant>(`${environment.apiUrl}/tenants/me`, dto);
  }

  completeOnboarding(dto: any): Observable<Tenant> {
    return this.http.post<Tenant>(`${environment.apiUrl}/tenants/complete-onboarding`, dto);
  }
}
