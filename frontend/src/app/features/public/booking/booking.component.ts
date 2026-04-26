import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantsService, Tenant } from '../../../core/services/tenants.service';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
      <div *ngIf="loading" class="animate-pulse flex flex-col items-center gap-4">
        <div class="w-20 h-20 bg-white/5 rounded-2xl"></div>
        <div class="h-6 w-48 bg-white/5 rounded-lg"></div>
      </div>

      <div *ngIf="!loading && tenant" class="w-full max-w-md glass p-8 rounded-3xl border border-white/10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
        <div class="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
          <img *ngIf="tenant.logoUrl" [src]="tenant.logoUrl" class="w-full h-full object-cover">
          <span *ngIf="!tenant.logoUrl" class="text-4xl">🏢</span>
        </div>
        
        <div class="text-center space-y-2">
          <h1 class="text-3xl font-bold text-text-main tracking-tight">{{ tenant.name }}</h1>
          <p class="text-text-muted">¡Bienvenido! Pronto podrás reservar tus turnos aquí.</p>
        </div>

        <div class="w-full pt-6 border-t border-white/5">
          <div class="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
            <span class="text-primary font-bold text-sm">Página en construcción 🚧</span>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && error" class="text-center space-y-4">
        <span class="text-6xl">🔍</span>
        <h2 class="text-xl font-bold text-text-main">Negocio no encontrado</h2>
        <p class="text-text-muted">El link que ingresaste no parece ser válido.</p>
        <button (click)="goToHome()" class="px-6 py-2 bg-white/5 hover:bg-white/10 text-text-main rounded-xl transition-all border border-white/10 font-bold">
          Ir al Inicio
        </button>
      </div>
    </div>
  `,
  styles: [`
    .glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
  `]
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tenantsService = inject(TenantsService);

  tenant: Tenant | null = null;
  loading = true;
  error = false;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('publicSlug');
    if (slug) {
      this.loadTenant(slug);
    } else {
      this.loading = false;
      this.error = true;
    }
  }

  loadTenant(slug: string) {
    // We need to implement this in TenantsService too (calling the public endpoint)
    // For now let's assume getPublicInfo exists or we add it
    this.tenantsService.getPublicInfo(slug).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
