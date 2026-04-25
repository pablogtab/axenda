import { Component, EventEmitter, Input, Output, inject, OnDestroy, HostListener, OnInit, effect, ElementRef } from '@angular/core';
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
         [class.navigating]="activeDir === 'prev'"
         (click)="navigate.emit('prev')">
      <div class="zone-content">
        <span class="text-2xl">‹</span>
        <span class="text-[10px] uppercase font-bold vertical-text text-center">{{ prevLabel }}</span>
      </div>
    </div>

    <!-- Zona Derecha -->
    <div class="day-change-zone right-zone"
         [class.visible]="agendaService.isDragging() || agendaService.isNavigating()"
         [class.navigating]="activeDir === 'next'"
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
  private el = inject(ElementRef);
  private navigationTimer: any = null;
  public activeDir: 'prev' | 'next' | null = null;

  constructor() {
    // Detección reactiva de posición para navegación lateral
    effect(() => {
      const x = this.agendaService.mouseX();
      const dragging = this.agendaService.isDragging();

      if (!dragging) {
        if (this.activeDir) this.onZoneLeave();
        return;
      }

      const rect = this.el.nativeElement.getBoundingClientRect();
      const relativeX = x - rect.left;
      const width = rect.width;
      const zoneWidth = 80;
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
