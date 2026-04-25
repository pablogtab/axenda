import { Component, EventEmitter, Input, Output, inject, OnDestroy, HostListener, OnInit, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgendaService } from '../../agenda.service';
import { SidebarService } from '@core/services/sidebar.service';

@Component({
  selector: 'app-agenda-navigation-zones',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Zona Izquierda -->
    <div class="day-change-zone left-zone" 
         [style.left]="offsetLeft"
         [class.visible]="agendaService.isDragging() && !agendaService.isNavigating()"
         [class.navigating]="activeDir === 'prev' && (agendaService.isDragging() || !sidebarService.isMobile())"
         (click)="navigate.emit('prev')">
      <div class="zone-content">
        <span class="text-2xl">‹</span>
        <span class="text-[10px] uppercase font-bold vertical-text text-center">{{ prevLabel }}</span>
      </div>
    </div>

    <!-- Zona Derecha -->
    <div class="day-change-zone right-zone"
         [class.visible]="agendaService.isDragging() && !agendaService.isNavigating()"
         [class.navigating]="activeDir === 'next' && (agendaService.isDragging() || !sidebarService.isMobile())"
         (click)="navigate.emit('next')">
      <div class="zone-content">
        <span class="text-2xl">›</span>
        <span class="text-[10px] uppercase font-bold vertical-text text-center">{{ nextLabel }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./agenda-navigation-zones.component.css'],
  styles: [`
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 999;
    }
    .day-change-zone {
      pointer-events: auto;
    }
  `]
})
export class AgendaNavigationZonesComponent implements OnInit, OnDestroy {
  @Input() prevLabel = 'Anterior';
  @Input() nextLabel = 'Siguiente';
  @Input() offsetLeft = '0px';
  @Input() disabled = false;
  @Input() currentView = '';
  @Output() navigate = new EventEmitter<'prev' | 'next'>();

  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);
  private el = inject(ElementRef);
  private navigationTimer: any = null;
  public activeDir: 'prev' | 'next' | null = null;

  // Propiedades para detección de Swipe en Mobile
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;

  constructor() {
    // Detección reactiva de posición para navegación lateral durante DRAG
    effect(() => {
      const x = this.agendaService.mouseX();
      const dragging = this.agendaService.isDragging();

      if (!dragging) {
        if (this.activeDir && !this.agendaService.isNavigating()) this.onZoneLeave();
        return;
      }

      const rect = this.el.nativeElement.getBoundingClientRect();
      const relativeX = x - rect.left;
      const width = rect.width;
      const zoneWidth = this.sidebarService.isMobile() ? 40 : 80;
      const offset = parseInt(this.offsetLeft) || 0;

      // Detección relativa al componente (ignora el sidebar)
      if (relativeX >= offset && relativeX <= offset + zoneWidth) {
        this.onZoneEnter('prev');
      } else if (relativeX >= width - zoneWidth && relativeX <= width) {
        this.onZoneEnter('next');
      } else {
        this.onZoneLeave();
      }
    });
  }

  ngOnInit(): void { }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // --- Lógica de Swipe para Mobile ---
  
  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.sidebarService.isMobile() || this.disabled) return;
    
    const touch = event.touches[0];
    const rect = this.el.nativeElement.getBoundingClientRect();

    // Solo capturar si el touch empieza dentro del área de la agenda
    if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
        touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = Date.now();
    } else {
      this.touchStartX = 0;
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.sidebarService.isMobile() || this.disabled || this.touchStartX === 0) return;
    
    // Si se inicia un arrastre de turno, invalidamos el inicio del swipe para evitar 
    // que al soltar el turno se interprete como una navegación lateral.
    if (this.agendaService.isDragging()) {
      this.touchStartX = 0;
      this.activeDir = null;
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const absX = Math.abs(deltaX);

    const duration = Date.now() - this.touchStartTime;
    const dynamicThreshold = 30 + (duration * 5);

    // Feedback visual preventivo si el movimiento es horizontal y suficientemente rápido
    if (absX > dynamicThreshold) {
      this.activeDir = deltaX > 0 ? 'prev' : 'next';
    } else {
      this.activeDir = null;
    }
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.sidebarService.isMobile() || this.disabled || this.touchStartX === 0) {
      this.touchStartX = 0;
      this.activeDir = null;
      return;
    }
    
    if (this.agendaService.isDragging()) {
      this.touchStartX = 0;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const duration = Date.now() - this.touchStartTime;

    // Calculamos el umbral dinámico usando una recta: d = m*t + b
    // Queremos que para un t pequeño (flick rápido), baste con poca distancia (~60px)
    // Pero si el tiempo t aumenta, la distancia requerida crece para evitar gestos lentos.
    const minRequiredDistance = 60 + (duration * 0.2); 

    // Umbral: Distancia dinámica, claramente horizontal y tiempo máximo razonable
    if (absX > minRequiredDistance && absX > absY * 1.5 && duration < 700) {
      const dir = deltaX > 0 ? 'prev' : 'next';
      this.activeDir = dir;
      this.navigate.emit(dir);
      this.agendaService.triggerNavigationFeedback();
      
      // Mantener el feedback visual durante la transición
      setTimeout(() => {
        this.activeDir = null;
      }, 500);
    } else {
      this.activeDir = null;
    }
    
    this.touchStartX = 0;
  }

  // --- Lógica de Navegación por Hover (Zonas de Drag) ---

  onZoneEnter(dir: 'prev' | 'next'): void {
    if (this.activeDir === dir) return;
    
    this.clearTimer();
    if (!this.agendaService.isDragging()) return;

    this.activeDir = dir;
    this.startNavigationTimer(dir);
  }

  private startNavigationTimer(dir: 'prev' | 'next'): void {
    this.navigationTimer = setTimeout(() => {
      if (this.agendaService.isDragging() && this.activeDir === dir) {
        this.navigate.emit(dir);
        this.agendaService.triggerNavigationFeedback();
        this.startNavigationTimer(dir);
      } else {
        this.clearTimer();
      }
    }, 800);
  }

  onZoneLeave(): void {
    this.activeDir = null;
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.navigationTimer) {
      clearTimeout(this.navigationTimer);
      this.navigationTimer = null;
    }
  }
}
