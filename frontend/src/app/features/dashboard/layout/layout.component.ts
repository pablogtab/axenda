import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { TenantsService } from '../../../core/services/tenants.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { TrialBannerComponent } from '../../../shared/components/trial-banner/trial-banner.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TrialBannerComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private tenantsService = inject(TenantsService);
  public router = inject(Router);
  public sidebarService = inject(SidebarService);
  private subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    // Cargar información de suscripción
    this.subscriptionService.loadStatus();

    this.tenantsService.getMe().subscribe({
      next: (tenant) => {
        this.tenantsService.setTenant(tenant);
      },
      error: (err) => {
        console.error('Error loading tenant info', err);
        // If we can't load tenant, maybe token is invalid
        if (err.status === 401) {
          this.authService.logout();
        }
      }
    });
  }

  isAgendaView(): boolean {
    return this.router.url.includes('/dashboard/agenda');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
