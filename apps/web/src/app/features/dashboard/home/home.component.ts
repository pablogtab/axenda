import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 2rem;">
      <h1 class="text-gradient">Bienvenido al Dashboard</h1>
      <p style="color: var(--text-muted);">Pronto verás aquí el resumen de tus turnos.</p>
    </div>
  `
})
export class HomeComponent {}
