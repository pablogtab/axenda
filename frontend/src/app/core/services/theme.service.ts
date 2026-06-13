import { Injectable, signal, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'axenda-theme';
  private storage = inject(StorageService);
  public isDark = signal<boolean>(this.getInitialTheme());

  constructor() {
    // Aplicar el tema inicial
    this.applyTheme(this.isDark());

    // Reaccionar a cambios en el signal
    effect(() => {
      const dark = this.isDark();
      this.applyTheme(dark);
      this.storage.set(this.THEME_KEY, dark ? 'dark' : 'light');
    });
  }

  public toggle(): void {
    this.isDark.set(!this.isDark());
  }

  private getInitialTheme(): boolean {
    const saved = this.storage.get<string | null>(this.THEME_KEY, null);
    if (saved) {
      return saved === 'dark';
    }
    // Sin preferencia guardada: modo claro por defecto
    return false;
  }

  private applyTheme(dark: boolean): void {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  }
}
