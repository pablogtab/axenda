import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { StorageService } from './storage.service';

export interface SubscriptionStatus {
  plan: {
    code: string;
    name: string;
    description: string;
  };
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INACTIVE';
  billingCycle: 'MONTHLY' | 'YEARLY';
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  isTrial: boolean;
  isActive: boolean;
  limits: {
    maxProfessionals: number;
    maxBranches: number;
    maxAppointments: number;
    maxUsers: number;
    maxWhatsapp: number;
    hasReports: boolean;
    hasOnlinePayments: boolean;
    hasAutoReviews: boolean;
  };
  usage: {
    professionals: number;
    branches: number;
    users: number;
    appointmentsMonth: number;
    whatsappMonth: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(StorageService);
  private apiUrl = `${environment.apiUrl}/subscriptions`;

  private _status = signal<SubscriptionStatus | null>(null);

  // Selectores de estado (Signals)
  status = computed(() => this._status());
  plan = computed(() => this._status()?.plan);
  isTrial = computed(() => this._status()?.isTrial ?? false);
  trialDaysRemaining = computed(() => this._status()?.trialDaysRemaining ?? 0);
  isActive = computed(() => this._status()?.isActive ?? false);
  
  // Límites y Uso
  limits = computed(() => this._status()?.limits);
  usage = computed(() => this._status()?.usage);

  // Lógica de visibilidad del banner (reaparece cada 2 horas)
  private readonly DISMISSED_KEY = 'axenda_trial_banner_dismissed';
  private _dismissTrigger = signal(Date.now());
  
  bannerVisible = computed(() => {
    this._dismissTrigger();
    if (!this.isTrial()) return false;
    
    const lastDismissed = this.storage.get<string | null>(this.DISMISSED_KEY, null);
    if (!lastDismissed) return true;
    
    const twoHours = 2 * 60 * 60 * 1000;
    const isExpired = (Date.now() - parseInt(lastDismissed, 10)) > twoHours;
    return isExpired;
  });

  /**
   * Carga el estado de la suscripción desde el backend
   */
  async loadStatus(): Promise<SubscriptionStatus | null> {
    try {
      const data = await firstValueFrom(
        this.http.get<SubscriptionStatus>(`${this.apiUrl}/status`)
      );
      this._status.set(data);
      return data;
    } catch (error) {
      console.error('Error cargando estado de suscripción:', error);
      return null;
    }
  }

  /**
   * Oculta el banner y guarda el momento del cierre
   */
  dismissBanner() {
    this.storage.set(this.DISMISSED_KEY, Date.now().toString());
    this._dismissTrigger.set(Date.now());
  }

  /**
   * Navega a la pantalla de gestión de plan y suscripción
   */
  goToUpgrade() {
    this.router.navigate(['/dashboard/settings'], { queryParams: { section: 'billing' } });
  }

  /**
   * Limpia el estado (útil al hacer logout)
   */
  clear() {
    this._status.set(null);
    this.storage.remove(this.DISMISSED_KEY);
  }
}
