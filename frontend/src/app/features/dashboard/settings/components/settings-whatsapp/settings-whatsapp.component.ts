import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhatsappService, WhatsappConfig } from '../../../../../core/services/whatsapp.service';
import { SubscriptionService } from '../../../../../core/services/subscription.service';
import { SnackbarService } from '../../../../../core/services/snackbar.service';

@Component({
  selector: 'app-settings-whatsapp',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-whatsapp.component.html',
})
export class SettingsWhatsappComponent implements OnInit {
  private whatsappService = inject(WhatsappService);
  public subService = inject(SubscriptionService);
  private snackbar = inject(SnackbarService);

  config = signal<WhatsappConfig | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.whatsappService.getConfig().subscribe({
      next: (config) => {
        this.config.set(config);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  connect() {
    // TODO: Implement Meta Embedded Signup Popup logic
    // This will open a popup window with the Meta Embedded Signup flow
    this.snackbar.info('Iniciando conexión con Meta Business Platform...');
    
    // Placeholder for the flow:
    // 1. Open popup: https://www.facebook.com/v21.0/dialog/whatsapp_business_management?client_id=...
    // 2. Listen for message from popup
    // 3. Send code to backend
  }
}
