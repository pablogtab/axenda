import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.css'
})
export class TermsComponent {
  lastUpdated = '27 de Mayo de 2026';

  sections = [
    { id: 'aceptacion', title: '1. Aceptación de los Términos' },
    { id: 'servicio', title: '2. Descripción del Servicio' },
    { id: 'cuentas', title: '3. Registro y Seguridad de las Cuentas' },
    { id: 'pagos', title: '4. Planes, Facturación y Reembolsos' },
    { id: 'whatsapp', title: '5. Uso de Canales de Mensajería' },
    { id: 'responsabilidad', title: '6. Limitación de Responsabilidad' },
    { id: 'modificaciones', title: '7. Modificaciones del Servicio' },
    { id: 'contacto', title: '8. Contacto' }
  ];

  scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
