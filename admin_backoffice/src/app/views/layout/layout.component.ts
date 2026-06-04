import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  template: `
    <div class="layout-wrapper">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="logo-title">Axenda Admin</span>
          <span class="logo-subtitle">Control Panel</span>
        </div>

        <nav class="nav-menu">
          <a routerLink="/dashboard/metrics" routerLinkActive="active" class="nav-item">
            <i class="pi pi-chart-bar nav-icon"></i>
            <span class="nav-label">Métricas</span>
          </a>
          
          <a routerLink="/dashboard/tenants" routerLinkActive="active" class="nav-item">
            <i class="pi pi-users nav-icon"></i>
            <span class="nav-label">Cuentas (Tenants)</span>
          </a>

          <a routerLink="/dashboard/coupons" routerLinkActive="active" class="nav-item">
            <i class="pi pi-ticket nav-icon"></i>
            <span class="nav-label">Cupones</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <button 
            pButton 
            icon="pi pi-sign-out" 
            label="Cerrar Sesión" 
            class="p-button-danger p-button-outlined w-full"
            (click)="logout()"
          ></button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content">
        <header class="content-header">
          <h1 class="header-title">Backoffice</h1>
        </header>
        
        <div class="content-body">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      display: flex;
      min-height: 100vh;
      background-color: #0f172a;
      color: #f8fafc;
    }
    .sidebar {
      width: 260px;
      background-color: #1e293b;
      border-right: 1px solid #334155;
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
    }
    .sidebar-header {
      padding: 2rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .logo-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #3b82f6;
      letter-spacing: -0.025em;
    }
    .logo-subtitle {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
    }
    .nav-menu {
      flex: 1;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      color: #94a3b8;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .nav-item:hover {
      background-color: #334155;
      color: #f8fafc;
    }
    .nav-item.active {
      background-color: #3b82f6;
      color: #ffffff;
    }
    .nav-icon {
      font-size: 1.25rem;
    }
    .sidebar-footer {
      padding: 1.5rem;
      border-top: 1px solid #334155;
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow-y: auto;
    }
    .content-header {
      background-color: #1e293b;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #334155;
    }
    .header-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: #ffffff;
    }
    .content-body {
      padding: 2rem;
      flex: 1;
    }
  `],
})
export class LayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
