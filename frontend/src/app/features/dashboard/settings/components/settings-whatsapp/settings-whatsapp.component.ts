import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WhatsappService, WhatsappConfig, WhatsappTemplate } from '../../../../../core/services/whatsapp.service';
import { SubscriptionService } from '../../../../../core/services/subscription.service';
import { SnackbarService } from '../../../../../core/services/snackbar.service';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-settings-whatsapp',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './settings-whatsapp.component.html',
})
export class SettingsWhatsappComponent implements OnInit {
  private whatsappService = inject(WhatsappService);
  public subService = inject(SubscriptionService);
  private snackbar = inject(SnackbarService);

  config = signal<WhatsappConfig | null>(null);
  templates = signal<WhatsappTemplate[]>([]);
  selectedTemplate = signal<WhatsappTemplate | null>(null);
  loading = signal(true);

  nextResetDate = computed(() => {
    const configVal = this.config();
    if (!configVal || !configVal.lastResetDate) return null;
    
    const date = new Date(configVal.lastResetDate);
    date.setMonth(date.getMonth() + 1);
    return date;
  });

  ngOnInit() {
    this.loadConfig();
    this.loadTemplates();
    this.subService.loadStatus();
  }

  loadConfig() {
    this.whatsappService.getConfig().subscribe({
      next: (config) => {
        this.config.set(config);
      },
      error: () => {}
    });
  }

  loadTemplates() {
    this.whatsappService.getTemplates().subscribe({
      next: (templates) => {
        // Filter out no-cancel templates to only show high-level actions
        const visibleTemplates = templates.filter(t => 
          t.name === 'axenda_booking_confirmation_v2' ||
          t.name === 'axenda_booking_reminder_v2' ||
          t.name === 'axenda_booking_cancellation_v2'
        );
        
        // Sort: confirmation first, then reminder, then cancellation
        const orderMap: Record<string, number> = {
          axenda_booking_confirmation_v2: 1,
          axenda_booking_reminder_v2: 2,
          axenda_booking_cancellation_v2: 3
        };
        visibleTemplates.sort((a, b) => (orderMap[a.name] || 99) - (orderMap[b.name] || 99));

        this.templates.set(visibleTemplates);
        if (visibleTemplates.length > 0) {
          this.selectedTemplate.set(visibleTemplates[0]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  selectTemplate(template: WhatsappTemplate) {
    this.selectedTemplate.set(template);
  }

  getFormattedHtml(body: string): string {
    const mockValues: Record<string, string> = {
      clientName: 'Juan Pérez',
      businessName: 'Barbería Axenda',
      serviceName: 'Corte + Barba',
      appointmentDate: '28/05',
      appointmentTime: '15:30 hs',
      branchAddress: 'Av. Corrientes 1234, CABA',
      cancelLink: 'https://axenda.ar/booking/cancel/mock-id'
    };
    
    // Replace template variables
    let text = body.replace(/{{(\w+)}}/g, (match, key) => {
      return mockValues[key] || match;
    });

    // Replace Markdown-style bold *word* to <b>word</b>
    text = text.replace(/\*([^*]+)\*/g, '<b>$1</b>');

    // Replace linebreaks
    text = text.replace(/\n/g, '<br>');

    return text;
  }

  getFriendlyName(name: string): string {
    const names: Record<string, string> = {
      axenda_booking_confirmation_v2: 'Confirmación de Reserva',
      axenda_booking_reminder_v2: 'Recordatorio de Turno',
      axenda_booking_cancellation_v2: 'Cancelación de Turno'
    };
    return names[name] || name;
  }

  getFriendlyDescription(name: string): string {
    const desc: Record<string, string> = {
      axenda_booking_confirmation_v2: 'Enviado automáticamente al agendar un turno desde la web pública.',
      axenda_booking_reminder_v2: 'Recordatorio automático enviado al cliente 24 horas antes del turno.',
      axenda_booking_cancellation_v2: 'Notificación enviada cuando cancelas la reserva desde el panel de administración.'
    };
    return desc[name] || '';
  }

  getFriendlyIcon(name: string): string {
    if (name.includes('confirmation')) return 'check_circle';
    if (name.includes('reminder')) return 'notifications_active';
    return 'cancel';
  }
}
