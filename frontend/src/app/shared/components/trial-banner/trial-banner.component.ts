import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    @if (subService.bannerVisible()) {
      <div 
        class="fixed bottom-4 left-4 right-24 p-3 glass border border-border rounded-2xl flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-4 duration-1000 z-[60]"
        [class.lg:left-[256px]]="!sidebarService.isCollapsed() && !sidebarService.isMobile()"
        [class.lg:left-4]="sidebarService.isCollapsed() || sidebarService.isMobile()">
        <div class="flex items-center gap-3 ml-1">
          <div class="relative flex items-center justify-center">
            <app-icon name="auto_awesome" class="text-primary/80 text-xl"></app-icon>
            <span class="absolute h-full w-full rounded-full bg-primary-glow animate-ping opacity-20"></span>
          </div>
          
          <p class="text-xs text-text-secondary">
            Estás probando <span class="text-text-main font-semibold text-gradient">Axenda Pro</span> 
            <span class="mx-1 opacity-30">•</span> 
            Quedan <span class="text-primary font-bold">{{ subService.trialDaysRemaining() }} días</span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button class="text-[10px] font-black uppercase tracking-widest text-text-main/60 hover:text-primary transition-colors cursor-pointer px-3 py-1.5 hover:bg-surface-subtle rounded-lg">
            Ver Planes
          </button>
          
          <div class="w-[1px] h-4 bg-border mx-1"></div>

          <button (click)="subService.dismissBanner()" class="p-1.5 hover:bg-surface-subtle-hover rounded-full text-text-dim hover:text-text-main transition-all cursor-pointer" title="Cerrar (reaparecerá en 2h)">
            <app-icon name="close" class="text-base"></app-icon>
          </button>
        </div>
      </div>
    }
  `
})
export class TrialBannerComponent {
  subService = inject(SubscriptionService);
  sidebarService = inject(SidebarService);
}
