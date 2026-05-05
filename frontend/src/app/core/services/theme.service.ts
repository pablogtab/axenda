import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'axenda-theme';
  public isDark = signal<boolean>(this.getInitialTheme());

  constructor() {
    // Aplicar el tema inicial
    this.applyTheme(this.isDark());

    // Reaccionar a cambios en el signal
    effect(() => {
      const dark = this.isDark();
      this.applyTheme(dark);
      localStorage.setItem(this.THEME_KEY, dark ? 'dark' : 'light');
    });
  }

  public toggle(): void {
    this.isDark.set(!this.isDark());
  }

  private getInitialTheme(): boolean {
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved) {
      return saved === 'dark';
    }
    // Si no hay guardado, preferir dark por defecto según la visión del proyecto
    return true;
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
