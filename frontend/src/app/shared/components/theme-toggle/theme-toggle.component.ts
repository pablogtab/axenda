import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flex items-center gap-3">
      <span *ngIf="showLabels" class="text-[10px] font-black uppercase tracking-widest text-text-muted select-none">
        {{ themeService.isDark() ? 'Modo Oscuro' : 'Modo Claro' }}
      </span>

      <div (click)="themeService.toggle()" 
           class="relative w-[44px] h-[24px] rounded-full cursor-pointer transition-all duration-500 ease-in-out shadow-inner border group bg-toggle-bg"
           [class.border-white/10]="themeService.isDark()"
           [class.border-black/5]="!themeService.isDark()">
        
        <!-- Knob -->
        <div class="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center shadow-md group-active:scale-90 bg-toggle-knob"
             [class.translate-x-[20px]]="themeService.isDark()">
          
          <!-- Icon -->
          <app-icon name="{{ themeService.isDark() ? 'dark_mode' : 'light_mode' }}" [class.rotate-[360deg]]="themeService.isDark()" style="font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 12;" class="!text-[12px] transition-all duration-500 text-toggle-icon"></app-icon>
        </div>
        
        <!-- Subtle Glow Effect -->
        <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
             [class.shadow-[0_0_12px_rgba(99,102,241,0.2)]]="themeService.isDark()"
             [class.shadow-[0_0_8px_rgba(0,0,0,0.1)]]="!themeService.isDark()">
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ThemeToggleComponent {
  public themeService = inject(ThemeService);
  @Input() showLabels = false;
}

