import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { StoragePipe } from '@shared/pipes/storage.pipe';

@Component({
  selector: 'app-settings-appearance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, StoragePipe],
  template: `
    <div class="h-full md:h-[calc(100vh-160px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto md:overflow-hidden" [formGroup]="form">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6 shrink-0">
        <h2 class="text-xl font-bold text-text-main flex items-center gap-2">
          <span class="material-symbols-rounded text-primary text-base">palette</span> Apariencia
        </h2>
        <!-- Theme Selector Dropdown -->
        <div class="relative">
          <button (click)="toggleThemeSelector.emit()"
            class="flex items-center gap-3 px-4 py-2 rounded-2xl bg-surface-subtle border border-border hover:bg-surface-subtle-hover transition-all group relative z-[100]"
            [class.ring-2]="showThemeSelector" [class.ring-primary]="showThemeSelector">
            <span class="material-symbols-rounded text-base group-hover:scale-110 transition-transform">palette</span>
            <div class="flex flex-col items-start leading-none">
              <span class="text-[10px] font-black text-text-dim uppercase tracking-wider mb-1">Plantillas</span>
              <span class="text-xs font-bold text-text-main">{{ activeTheme?.name || 'Personalizado' }}</span>
            </div>
            <span class="text-[10px] opacity-40 ml-2 transition-transform" [class.rotate-180]="showThemeSelector">▼</span>
          </button>
          <!-- Dropdown Menu -->
          <div *ngIf="showThemeSelector"
            class="absolute top-full right-0 mt-3 w-[420px] bg-surface/95 backdrop-blur-3xl rounded-[2.5rem] border border-border shadow-[0_40px_100px_rgba(0,0,0,0.4)] z-[100] p-5 animate-in fade-in slide-in-from-top-4 duration-500">

            <div class="flex items-center justify-between mb-5 px-1">
              <div>
                <h4 class="text-xs font-black text-text-main uppercase tracking-widest">Estilos de Marca</h4>
                <p class="text-[10px] text-text-dim mt-0.5">Elige una combinación prediseñada</p>
              </div>
              <div *ngIf="!activeTheme" class="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary-glow px-3 py-1 rounded-full border border-primary/20">
                <span class="relative flex h-1.5 w-1.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                Personalizado
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button *ngFor="let theme of colorPresets"
                (click)="applyPreset.emit(theme); closeThemeSelector.emit()"
                class="flex flex-col gap-4 p-4 rounded-[1.5rem] border border-border bg-surface-subtle hover:bg-surface-subtle-hover hover:border-primary/20 transition-all text-left group/card relative overflow-hidden">
                <div class="flex items-center justify-between relative z-10">
                  <span class="text-[11px] font-black text-text-main group-hover/card:text-primary transition-colors">{{ theme.name }}</span>
                  <div *ngIf="activeTheme?.name === theme.name" class="w-2 h-2 rounded-full bg-primary shadow-[0_0_15px_var(--color-primary)]"></div>
                </div>
                <!-- Color Preview Bar -->
                <div class="flex h-6 rounded-xl overflow-hidden border border-border shadow-inner">
                  <div class="h-full transition-all duration-500" [style.width]="'50%'" [style.backgroundColor]="theme.colors.bg"></div>
                  <div class="h-full transition-all duration-500" [style.width]="'35%'" [style.backgroundColor]="theme.colors.primary"></div>
                  <div class="h-full transition-all duration-500" [style.width]="'15%'" [style.backgroundColor]="theme.colors.accent"></div>
                </div>
                <!-- Hover Background Shine -->
                <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
              </button>
            </div>
          </div>
          <!-- Overlay to close when clicking outside -->
          <div *ngIf="showThemeSelector" (click)="closeThemeSelector.emit()" class="fixed inset-0 z-[90] cursor-default"></div>
        </div>
      </div>

      <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 md:overflow-hidden">
        <!-- Left Column: Settings (Scrollable) -->
        <div class="md:overflow-y-auto custom-scrollbar md:pr-4 space-y-6">
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-text-dim uppercase tracking-widest ml-1">Colores de Marca</h3>
            <div class="bg-surface-subtle border border-border rounded-[2rem] overflow-hidden divide-y divide-border">
              <!-- Primary Color -->
              <div class="flex items-center justify-between p-4 hover:bg-surface-subtle-hover transition-all">
                <span class="text-sm font-bold text-text-main">Primario</span>
                <div class="flex items-center gap-4">
                  <span class="text-xs font-mono text-text-dim">{{ form.get('primaryColor')?.value }}</span>
                  <input type="color" formControlName="primaryColor" class="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent">
                </div>
              </div>

              <!-- Primary Hover Color -->
              <div class="flex items-center justify-between p-4 hover:bg-surface-subtle-hover transition-all">
                <span class="text-sm font-bold text-text-main">Hover</span>
                <div class="flex items-center gap-4">
                  <span class="text-xs font-mono text-text-dim">{{ form.get('primaryHoverColor')?.value }}</span>
                  <input type="color" formControlName="primaryHoverColor" class="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent">
                </div>
              </div>

              <!-- Accent Color -->
              <div class="flex items-center justify-between p-4 hover:bg-surface-subtle-hover transition-all">
                <span class="text-sm font-bold text-text-main">Acento</span>
                <div class="flex items-center gap-4">
                  <span class="text-xs font-mono text-text-dim">{{ form.get('accentColor')?.value }}</span>
                  <input type="color" formControlName="accentColor" class="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent">
                </div>
              </div>
              <div class="flex items-center justify-between p-4 hover:bg-surface-subtle-hover transition-all">
                <span class="text-sm font-bold text-text-main">Fondo</span>
                <div class="flex items-center gap-4">
                  <span class="text-xs font-mono text-text-dim">{{ form.get('backgroundColor')?.value }}</span>
                  <input type="color" formControlName="backgroundColor" class="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent">
                </div>
              </div>

              <!-- Text Color -->
              <div class="flex items-center justify-between p-4 hover:bg-surface-subtle-hover transition-all">
                <span class="text-sm font-bold text-text-main">Texto</span>
                <div class="flex items-center gap-4">
                  <span class="text-xs font-mono text-text-dim">{{ form.get('textColor')?.value }}</span>
                  <input type="color" formControlName="textColor" class="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent">
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Right Column: Live Mockup -->
        <div class="min-h-[500px] md:h-full flex flex-col items-center justify-center bg-surface-subtle rounded-3xl border border-border relative overflow-hidden mt-6 md:mt-0">
          <div class="h-full w-full flex items-center justify-center p-4">
            <div
              class="h-full max-h-[580px] aspect-[9/16] rounded-[2rem] border-[8px] border-text-main/10 shadow-premium overflow-hidden transition-all duration-700 relative flex flex-col"
              [style.backgroundColor]="form.get('backgroundColor')?.value">
              <!-- Top Notch -->
              <div class="h-6 w-full shrink-0 flex items-center justify-center relative">
                <div class="w-16 h-4 bg-text-main/10 rounded-b-xl"></div>
              </div>

              <!-- Mini Banner -->
              <div class="h-24 w-full shrink-0 relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                <img *ngIf="form.get('bannerUrl')?.value" [src]="form.get('bannerUrl')?.value | storage" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/10"></div>
              </div>

              <!-- Mini Profile Section -->
              <div class="px-4 -mt-8 relative z-10 flex flex-col items-center shrink-0">
                <div class="w-16 h-16 rounded-2xl bg-surface border-4 border-border shadow-2xl overflow-hidden flex items-center justify-center"
                  [style.backgroundColor]="form.get('backgroundColor')?.value">
                  <img *ngIf="form.get('logoUrl')?.value" [src]="form.get('logoUrl')?.value | storage" class="w-full h-full object-cover">
                  <span *ngIf="!form.get('logoUrl')?.value" class="text-2xl font-black opacity-20" [style.color]="form.get('textColor')?.value">
                    {{ form.get('name')?.value?.charAt(0) || 'A' }}
                  </span>
                </div>
                <h4 class="mt-3 text-sm font-black text-center tracking-tight truncate w-full px-2" [style.color]="form.get('textColor')?.value">
                  {{ form.get('name')?.value || 'Tu Negocio' }}
                </h4>
              </div>

              <!-- Mini Content -->
              <div class="px-4 mt-6 flex-1 space-y-4">
                <div class="p-3 rounded-xl border border-border bg-surface-subtle space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="h-2 w-20 rounded-full bg-text-main/10"></div>
                    <div class="text-[10px] font-black" [style.color]="form.get('accentColor')?.value">$850</div>
                  </div>
                  <button class="w-full py-2.5 rounded-lg text-[10px] font-black text-white shadow-lg transition-all"
                    [style.backgroundColor]="form.get('primaryColor')?.value">
                    Agendar Turno
                  </button>
                </div>
                <div class="space-y-2 opacity-40">
                  <div class="h-1.5 w-full rounded-full bg-text-main/10"></div>
                  <div class="h-1.5 w-2/3 rounded-full bg-text-main/10"></div>
                </div>
              </div>

              <!-- Bottom Bar -->
              <div class="h-1.5 w-20 bg-text-main/10 rounded-full mx-auto mb-2 shrink-0"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsAppearanceComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) colorPresets!: any[];
  @Input({ required: true }) activeTheme!: any;
  @Input({ required: true }) showThemeSelector!: boolean;

  @Output() applyPreset = new EventEmitter<any>();
  @Output() toggleThemeSelector = new EventEmitter<void>();
  @Output() closeThemeSelector = new EventEmitter<void>();
}
