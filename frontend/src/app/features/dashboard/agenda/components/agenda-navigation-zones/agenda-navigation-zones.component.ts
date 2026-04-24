import { Component, EventEmitter, Input, Output, inject, OnDestroy } from '@angular/core';
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
         [class.visible]="agendaService.isDragging()"
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
         [class.visible]="agendaService.isDragging()"
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
  @Output() navigate = new EventEmitter<'prev' | 'next'>();

  agendaService = inject(AgendaService);
  private navigationTimer: any = null;

  ngOnDestroy(): void {
    this.clearTimer();
  }

  onZoneEnter(dir: 'prev' | 'next'): void {
    this.clearTimer();
    if (!this.agendaService.isDragging()) return;

    this.navigationTimer = setTimeout(() => {
      if (this.agendaService.isDragging()) {
        this.navigate.emit(dir);
        // Reiniciar para navegación continua solo si seguimos arrastrando
        this.onZoneEnter(dir);
      }
    }, 800); 
  }

  onZoneLeave(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.navigationTimer) {
      clearTimeout(this.navigationTimer);
      this.navigationTimer = null;
    }
  }
}
