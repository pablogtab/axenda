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

  @HostListener('wheel', ['$event'])
  onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.userConfig.updateAgendaZoom(this.userConfig.agendaZoom() + delta);
  }

  @HostListener('mousedown', ['$event'])
  onZoomMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Solo click izquierdo
    this.isZoomDragging = true;
    this.lastY = event.clientY;
    
    // Añadimos la clase para indicar el cursor de redimensión
    this.el.nativeElement.classList.add('cursor-ns-resize');
    
    document.addEventListener('mousemove', this.boundZoomMouseMove);
    document.addEventListener('mouseup', this.boundZoomMouseUp);
    event.preventDefault();
  }

  private boundZoomMouseMove = (event: MouseEvent) => this.onZoomMouseMove(event);
  private boundZoomMouseUp = () => {
    this.isZoomDragging = false;
    this.el.nativeElement.classList.remove('cursor-ns-resize');
    document.removeEventListener('mousemove', this.boundZoomMouseMove);
    document.removeEventListener('mouseup', this.boundZoomMouseUp);
  };

  private onZoomMouseMove(event: MouseEvent): void {
    if (!this.isZoomDragging) return;
    
    const deltaY = this.lastY - event.clientY; // Arriba es positivo (zoom in)
    if (Math.abs(deltaY) < 2) return; // Umbral de sensibilidad

    const zoomStep = deltaY * 0.005;
    this.userConfig.updateAgendaZoom(this.userConfig.agendaZoom() + zoomStep);
    this.lastY = event.clientY;
  }

  ngOnDestroy(): void {
    this.boundZoomMouseUp();
  }
}
