import { Component, EventEmitter, Input, Output, inject, OnDestroy, HostListener, OnInit, Renderer2 } from '@angular/core';
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
         (mouseenter)="onZoneEnter('prev')"
         (mouseleave)="onZoneLeave()"
         (dragenter)="onDragEnter($event, 'prev')"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
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
         (mouseenter)="onZoneEnter('next')"
         (mouseleave)="onZoneLeave()"
         (dragenter)="onDragEnter($event, 'next')"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
         (click)="navigate.emit('next')">
      <div class="zone-content">
        <span class="text-2xl">›</span>
        <span class="text-[10px] uppercase font-bold vertical-text text-center">{{ nextLabel }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./agenda-navigation-zones.component.css']
})
export class AgendaNavigationZonesComponent implements OnInit, OnDestroy {
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

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  activeDir: 'prev' | 'next' | null = null;

  onDragEnter(event: DragEvent, dir: 'prev' | 'next'): void {
    event.preventDefault();
    if (this.activeDir === dir) return;
    this.onZoneEnter(dir);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    // Re-check if we need to start timer (e.g. if it was cleared by accident)
    // But mostly we just need to preventDefault to allow the drag ghost to show over it
  }

  onDragLeave(event: DragEvent): void {
    // Only leave if we are really leaving the zone element, not just a child
    const target = event.relatedTarget as Node;
    const zone = event.currentTarget as Node;
    if (zone.contains(target)) return;
    
    this.onZoneLeave();
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
