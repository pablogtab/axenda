import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private breakpointObserver = inject(BreakpointObserver);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  public isCollapsed = signal<boolean>(false);
  public isMobile = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.breakpointObserver.observe(['(max-width: 1023px)']).subscribe(result => {
        this.isMobile.set(result.matches);
        if (result.matches) {
          this.isCollapsed.set(true);
        } else {
          this.isCollapsed.set(false);
        }
      });

      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd && this.isMobile()) {
          this.isCollapsed.set(true);
        }
      });
    }
  }

  toggle(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

  setCollapsed(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
  }
}
