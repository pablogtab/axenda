import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  private authService = inject(AuthService);
  public router = inject(Router);
  public sidebarService = inject(SidebarService);

  isAgendaView(): boolean {
    return this.router.url.includes('/dashboard/agenda');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
