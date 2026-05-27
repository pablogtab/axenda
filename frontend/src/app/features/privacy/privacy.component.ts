import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.css'
})
export class PrivacyComponent {
  lastUpdated = '27 de Mayo de 2026';

  sections = [
    { id: 'recoleccion', title: '1. Recolección de Información' },
    { id: 'uso', title: '2. Uso de la Información' },
    { id: 'compartir', title: '3. Compartir con Terceros' },
    { id: 'seguridad', title: '4. Seguridad de los Datos' },
    { id: 'derechos', title: '5. Sus Derechos' },
    { id: 'cookies', title: '6. Política de Cookies' },
    { id: 'contacto', title: '7. Contacto' }
  ];

  scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
