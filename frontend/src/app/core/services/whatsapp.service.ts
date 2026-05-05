import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WhatsappConfig {
  id: string;
  tenantId: string;
  wabaId?: string;
  phoneId?: string;
  verified: boolean;
  messagesSentMonth: number;
  lastResetDate: string;
  confirmationTemplateId?: string;
  reminderTemplateId?: string;
  cancellationTemplateId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/whatsapp`;

  getConfig(): Observable<WhatsappConfig | null> {
    return this.http.get<WhatsappConfig | null>(`${this.apiUrl}/config`);
  }

  updateConfig(config: Partial<WhatsappConfig>): Observable<WhatsappConfig> {
    return this.http.patch<WhatsappConfig>(`${this.apiUrl}/config`, config);
  }

  embeddedSignup(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/embedded-signup`, { code });
  }
}
