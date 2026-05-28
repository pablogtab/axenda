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
  endDate: string | null;
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
    extraWhatsappBalance?: number;
    extraWhatsappTotal?: number;
  };
  activePacks?: Array<{
    id: string;
    quantity: number;
    remaining: number;
    expiresAt: string;
    createdAt: string;
  }>;
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
  private _paymentsEnabled = signal<boolean>(true);

  // Selectores de estado (Signals)
  status = computed(() => this._status());
  plan = computed(() => this._status()?.plan);
  isTrial = computed(() => this._status()?.isTrial ?? false);
  trialDaysRemaining = computed(() => this._status()?.trialDaysRemaining ?? 0);
  isActive = computed(() => this._status()?.isActive ?? false);
  endDate = computed(() => this._status()?.endDate);
  paymentsEnabled = computed(() => this._paymentsEnabled());
  
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
   * Carga la configuración del sistema de facturación desde el backend
   */
  async loadConfig(): Promise<boolean> {
    try {
      const data = await firstValueFrom(
        this.http.get<{ paymentsEnabled: boolean }>(`${this.apiUrl}/config`)
      );
      this._paymentsEnabled.set(data.paymentsEnabled);
      return data.paymentsEnabled;
    } catch (error) {
      console.error('Error cargando config de pagos:', error);
      return true;
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
   * Crea un link de pago para la suscripción
   */
  async checkout(planId: string, billingCycle: 'MONTHLY' | 'YEARLY', quantity: number = 1, referralCode?: string): Promise<{ initPoint: string }> {
    return firstValueFrom(
      this.http.post<{ initPoint: string }>(`${this.apiUrl}/checkout`, {
        planId,
        billingCycle,
        quantity,
        referralCode
      })
    );
  }

  /**
   * Valida un código de referido o cupón
   */
  async validateReferralCode(code: string, planCode?: string): Promise<any> {
    const url = planCode
      ? `${this.apiUrl}/referrals/validate?code=${encodeURIComponent(code)}&planCode=${encodeURIComponent(planCode)}`
      : `${this.apiUrl}/referrals/validate?code=${encodeURIComponent(code)}`;
    return firstValueFrom(this.http.get<any>(url));
  }

  /**
   * Obtiene o genera el código de referido propio del usuario
   */
  async getMyReferralCode(): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.apiUrl}/referrals/my-code`));
  }

  /**
   * Personaliza el código de referido del usuario
   */
  async updateMyReferralCode(code: string): Promise<any> {
    return firstValueFrom(
      this.http.put<any>(`${this.apiUrl}/referrals/my-code`, { code })
    );
  }

  /**
   * Crea un link de pago para un paquete de WhatsApp
   */
  async checkoutPack(packCode: string): Promise<{ initPoint: string }> {
    return firstValueFrom(
      this.http.post<{ initPoint: string }>(`${this.apiUrl}/checkout-pack`, {
        packCode
      })
    );
  }

  /**
   * Obtiene los planes disponibles
   */
  async getPlans(): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${this.apiUrl}/plans`)
    );
  }

  /**
   * Verifica activamente el estado de un pago o suscripción de Mercado Pago
   */
  async verifySubscription(paymentId: string): Promise<any> {
    return firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/verify?payment_id=${paymentId}`)
    );
  }

  /**
   * Verifica activamente el estado de un pago o suscripción de Mercado Pago (público, sin auth)
   */
  async verifySubscriptionPublic(paymentId: string): Promise<any> {
    return firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/public-verify?payment_id=${paymentId}`)
    );
  }

  /**
   * Obtiene el historial de facturas/pagos del tenant actual
   */
  async getInvoices(): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${this.apiUrl}/invoices`)
    );
  }

  /**
   * Limpia el estado (útil al hacer logout)
   */
  clear() {
    this._status.set(null);
    this.storage.remove(this.DISMISSED_KEY);
  }
}
