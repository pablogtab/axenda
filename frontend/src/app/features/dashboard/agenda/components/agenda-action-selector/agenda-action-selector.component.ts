import { Component, Inject, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-agenda-action-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed z-[1000] animate-in fade-in zoom-in duration-200"
         [style.left.px]="pos.left"
         [style.top.px]="pos.top"
         (click)="$event.stopPropagation()">
      <div class="bg-bg-secondary rounded-xl border border-white/10 shadow-2xl overflow-hidden w-[260px] backdrop-blur-md">
        <div class="p-1.5 grid gap-1">
          <button (click)="select('APPOINTMENT')" 
                  class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all group">
            <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
              <i class="fa-solid fa-calendar-plus text-sm"></i>
            </div>
            <div class="text-left">
              <div class="text-sm font-bold text-text-main">Nuevo Turno</div>
              <div class="text-[10px] text-text-dim">Agendar un servicio</div>
            </div>
          </button>

          <button (click)="select('EXCEPTION')" 
                  class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all group">
            <div class="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
              <i class="fa-solid fa-lock text-sm"></i>
            </div>
            <div class="text-left">
              <div class="text-sm font-bold text-text-main">Bloquear Horario</div>
              <div class="text-[10px] text-text-dim">Crear una excepción</div>
            </div>
          </button>
        </div>

        <div class="border-t border-white/5 p-1">
          <button (click)="close()" 
                  class="w-full py-1.5 text-[11px] font-bold text-text-dim hover:text-white transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class AgendaActionSelectorComponent {
  private el = inject(ElementRef);
  pos = { left: 0, top: 0 };

  constructor(
    public dialogRef: DialogRef<'APPOINTMENT' | 'EXCEPTION'>,
    @Inject(DIALOG_DATA) public data: { x: number, y: number }
  ) {
    this.calculatePosition();
  }

  private calculatePosition(): void {
    const x = this.data.x;
    const y = this.data.y;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    
    const menuWidth = 260;
    const menuHeight = 160; // Altura estimada con margen
    
    let left = x - (menuWidth / 2);
    let top = y + 10;
    
    // Ajuste horizontal para no salirse de los bordes
    if (left + menuWidth > winWidth) left = winWidth - menuWidth - 15;
    if (left < 15) left = 15;
    
    // Si se sale por abajo, lo mostramos hacia arriba
    if (top + menuHeight > winHeight) {
      top = y - menuHeight - 10;
    }
    
    this.pos = { left, top };
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Si el clic es fuera del componente, cerramos
    if (!this.el.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  select(action: 'APPOINTMENT' | 'EXCEPTION'): void {
    this.dialogRef.close(action);
  }

  close(): void {
    this.dialogRef.close();
  }
}
