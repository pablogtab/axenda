import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { AppointmentsService, Appointment, AppointmentStatus } from '@core/services/appointments.service';
import { ClientsService } from '@core/services/clients.service';
import { TenantsService } from '@core/services/tenants.service';
import { SnackbarService } from '@core/services/snackbar.service';
import { QrDialogComponent } from '../../../shared/components/qr-dialog/qr-dialog.component';
import { SubscriptionService } from '@core/services/subscription.service';
import { forkJoin, map } from 'rxjs';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, QrDialogComponent, IconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private clientsService = inject(ClientsService);
  private tenantsService = inject(TenantsService);
  private snackbar = inject(SnackbarService);
  public subService = inject(SubscriptionService);

  // Signals para el estado
  isLoading = signal(true);
  showQrModal = signal(false);
  todayAppointments = signal<Appointment[]>([]);
  totalClients = signal(0);
  
  // Datos del Tenant
  tenant = this.tenantsService.currentTenant;
  
  // Computed para métricas
  appointmentsCount = computed(() => this.todayAppointments().length);
  confirmedCount = computed(() => 
    this.todayAppointments().filter(a => a.status === AppointmentStatus.CONFIRMED).length
  );
  
  nextAppointment = computed(() => {
    const now = new Date();
    return this.todayAppointments()
      .filter(a => new Date(a.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;
  });

  upcomingAppointments = computed(() => {
    const now = new Date();
    return this.todayAppointments()
      .filter(a => new Date(a.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  });

  publicBookingUrl = computed(() => {
    const t = this.tenant();
    if (!t?.publicSlug) return null;
    // En producción esto debería usar el dominio real
    return `${window.location.origin}/${t.publicSlug}`;
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    
    const today = new Date().toISOString().split('T')[0];
    
    forkJoin({
      appointments: this.appointmentsService.findAll({ startDate: today, endDate: today }),
      clients: this.clientsService.findAll(1, 1)
    }).subscribe({
      next: (data) => {
        this.todayAppointments.set(data.appointments);
        this.totalClients.set(data.clients.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackbar.error('Error al cargar datos del dashboard');
        this.isLoading.set(false);
      }
    });
  }

  copyBookingLink(): void {
    const url = this.publicBookingUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      this.snackbar.success('¡Link copiado al portapapeles!');
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buen día!';
    if (hour < 20) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  }

  getInitials(client: any): string {
    return `${client.firstName[0]}${client.lastName[0]}`;
  }

  formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
