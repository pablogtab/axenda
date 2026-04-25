import { Directive, inject, HostListener, OnDestroy, ElementRef } from '@angular/core';
import { UserConfigurationService } from '@services/user-configuration.service';

@Directive({
  selector: '[appAgendaZoom]',
  standalone: true
})
export class AgendaZoomDirective implements OnDestroy {
  private userConfig = inject(UserConfigurationService);
  private el = inject(ElementRef);

  private isZoomDragging = false;
  private lastY = 0;

  // Pinch zoom state
  private isPinching = false;
  private initialPinchDistance = 0;
  private initialZoom = 1;

  @HostListener('wheel', ['$event'])
  onMouseWheel(event: WheelEvent): void {
    const isHandle = (event.target as HTMLElement).closest('.zoom-handle');
    
    // Solo hacemos zoom con la rueda si:
    // 1. Se presiona Ctrl/Meta (atajo estándar de zoom)
    // 2. El mouse está sobre el área de las horas (zoom-handle)
    if (event.ctrlKey || event.metaKey || isHandle) {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      this.userConfig.updateAgendaZoom(this.userConfig.agendaZoom() + delta);
    }
    // De lo contrario, dejamos que el evento siga para que el scroll funcione
  }

  @HostListener('mousedown', ['$event'])
  onZoomMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Solo click izquierdo
    
    // Solo hacemos zoom si se inicia en un "zoom-handle"
    const isHandle = (event.target as HTMLElement).closest('.zoom-handle');
    if (!isHandle) return;

    this.isZoomDragging = true;
    this.lastY = event.clientY;
    
    this.el.nativeElement.classList.add('cursor-ns-resize');
    
    document.addEventListener('mousemove', this.boundZoomMouseMove);
    document.addEventListener('mouseup', this.boundZoomMouseUp);
    event.preventDefault();
  }

  @HostListener('touchstart', ['$event'])
  onZoomTouchStart(event: TouchEvent): void {
    const isHandle = (event.target as HTMLElement).closest('.zoom-handle');

    if (event.touches.length === 1 && isHandle) {
      // Drag vertical para zoom (solo en handles)
      this.isZoomDragging = true;
      this.lastY = event.touches[0].clientY;
      
      document.addEventListener('touchmove', this.boundZoomTouchMove, { passive: false });
      document.addEventListener('touchend', this.boundZoomTouchEnd);
      
      event.preventDefault();
    } else if (event.touches.length === 2) {
      // Pinch to zoom (en cualquier parte del elemento con la directiva)
      this.isPinching = true;
      this.initialPinchDistance = this.getPinchDistance(event);
      this.initialZoom = this.userConfig.agendaZoom();
      
      document.addEventListener('touchmove', this.boundZoomTouchMove, { passive: false });
      document.addEventListener('touchend', this.boundZoomTouchEnd);
      
      event.preventDefault();
    }
  }

  private getPinchDistance(event: TouchEvent): number {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private boundZoomMouseMove = (event: MouseEvent) => this.onZoomMouseMove(event);
  private boundZoomMouseUp = () => {
    this.isZoomDragging = false;
    this.el.nativeElement.classList.remove('cursor-ns-resize');
    document.removeEventListener('mousemove', this.boundZoomMouseMove);
    document.removeEventListener('mouseup', this.boundZoomMouseUp);
  };

  private boundZoomTouchMove = (event: TouchEvent) => this.onZoomTouchMove(event);
  private boundZoomTouchEnd = () => {
    this.isZoomDragging = false;
    this.isPinching = false;
    document.removeEventListener('touchmove', this.boundZoomTouchMove);
    document.removeEventListener('touchend', this.boundZoomTouchEnd);
  };

  private onZoomMouseMove(event: MouseEvent): void {
    if (!this.isZoomDragging) return;
    
    const deltaY = this.lastY - event.clientY; // Arriba es positivo (zoom in)
    if (Math.abs(deltaY) < 2) return; // Umbral de sensibilidad

    const zoomStep = deltaY * 0.005;
    this.userConfig.updateAgendaZoom(this.userConfig.agendaZoom() + zoomStep);
    this.lastY = event.clientY;
  }

  private onZoomTouchMove(event: TouchEvent): void {
    if (this.isPinching && event.touches.length === 2) {
      const currentDistance = this.getPinchDistance(event);
      if (Math.abs(currentDistance - this.initialPinchDistance) < 5) return;

      const ratio = currentDistance / this.initialPinchDistance;
      // Aplicamos un factor para que el zoom sea suave
      const newZoom = this.initialZoom + (ratio - 1) * 0.8;
      this.userConfig.updateAgendaZoom(newZoom);
      event.preventDefault();
    } else if (this.isZoomDragging && event.touches.length === 1) {
      const deltaY = this.lastY - event.touches[0].clientY;
      if (Math.abs(deltaY) < 2) return;

      const zoomStep = deltaY * 0.008; // Un poco más sensible en touch
      this.userConfig.updateAgendaZoom(this.userConfig.agendaZoom() + zoomStep);
      this.lastY = event.touches[0].clientY;
      event.preventDefault();
    }
  }

  ngOnDestroy(): void {
    this.boundZoomMouseUp();
    this.boundZoomTouchEnd();
  }
}
