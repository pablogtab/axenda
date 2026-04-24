import { Component, EventEmitter, Input, Output, inject, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgendaService } from '../../agenda.service';

@Component({
  selector: 'app-agenda-navigation-zones',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Zona Izquierda -->
    <div class="day-change-zone left-zone" 
         [style.left]="offsetLeft"
         [class.visible]="agendaService.isDragging() || agendaService.isNavigating()"
         (mouseenter)="onZoneEnter('prev')"
         (mouseleave)="onZoneLeave()"
         (click)="navigate.emit('prev')">
      <div class="zone-content">
        <span class="text-2xl">‹</span>
        <span class="text-[10px] uppercase font-bold vertical-text text-center">{{ prevLabel }}</span>
      </div>
    </div>

    <!-- Zona Derecha -->
    <div class="day-change-zone right-zone"
         [class.visible]="agendaService.isDragging() || agendaService.isNavigating()"
         (mouseenter)="onZoneEnter('next')"
         (mouseleave)="onZoneLeave()"
         (click)="navigate.emit('next')">
      <div class="zone-content">
        <span class="text-2xl">›</span>
        <span class="text-[10px] uppercase font-bold vertical-text text-center">{{ nextLabel }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./agenda-navigation-zones.component.css']
})
export class AgendaNavigationZonesComponent implements OnDestroy {
  @Input() prevLabel = 'Anterior';
  @Input() nextLabel = 'Siguiente';
  @Input() offsetLeft = '0px';
  @Input() disabled = false;
  @Input() currentView = '';
  @Output() navigate = new EventEmitter<'prev' | 'next'>();

  agendaService = inject(AgendaService);
  private navigationTimer: any = null;
  private lastWheelNavTime = 0;
  private readonly wheelNavThrottle = 200;

  ngOnDestroy(): void {
    this.clearTimer();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardNavigation(event: KeyboardEvent) {
    if (this.disabled) return;
    
    const activeElement = document.activeElement;
    const isInput = activeElement?.tagName === 'INPUT' || 
                   activeElement?.tagName === 'TEXTAREA' || 
                   activeElement?.hasAttribute('contenteditable');
    
    if (isInput) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      this.navigate.emit('prev');
      this.agendaService.triggerNavigationFeedback();
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      this.navigate.emit('next');
      this.agendaService.triggerNavigationFeedback();
      event.preventDefault();
    }
  }

  @HostListener('document:wheel', ['$event'])
  handleWheelNavigation(event: WheelEvent) {
    if (this.disabled || this.agendaService.isDragging()) return;
    if (this.currentView !== 'month') return;

    const activeElement = document.activeElement;
    const isInput = activeElement?.tagName === 'INPUT' || 
                   activeElement?.tagName === 'TEXTAREA' || 
                   activeElement?.hasAttribute('contenteditable');
    
    if (isInput) return;

    const now = Date.now();
    if (now - this.lastWheelNavTime < this.wheelNavThrottle) return;

    if (Math.abs(event.deltaY) > 30) {
      this.lastWheelNavTime = now;
      this.navigate.emit(event.deltaY < 0 ? 'prev' : 'next');
      this.agendaService.triggerNavigationFeedback();
      event.preventDefault();
    }
  }

  onZoneEnter(dir: 'prev' | 'next'): void {
    console.log(`[NavigationZones] Enter: ${dir}, isDragging: ${this.agendaService.isDragging()}`);
    this.clearTimer();
    if (!this.agendaService.isDragging()) return;

    this.navigationTimer = setTimeout(() => {
      if (this.agendaService.isDragging()) {
        console.log(`[NavigationZones] Firing navigation: ${dir}`);
        this.navigate.emit(dir);
        // Reiniciar para navegación continua solo si seguimos arrastrando
        this.onZoneEnter(dir);
      }
    }, 800); 
  }

  onZoneLeave(): void {
    console.log(`[NavigationZones] Leave`);
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.navigationTimer) {
      clearTimeout(this.navigationTimer);
      this.navigationTimer = null;
    }
  }
}
