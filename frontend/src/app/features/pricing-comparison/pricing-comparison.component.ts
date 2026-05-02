import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pricing-comparison',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing-comparison.component.html',
  styleUrl: './pricing-comparison.component.css'
})
export class PricingComparisonComponent {
  comparisonData = [
    {
      category: 'Gestión de Agenda',
      features: [
        { name: 'Turnos Mensuales', starter: '25', pro: 'Ilimitados', business: 'Ilimitados', elite: 'Ilimitados' },
        { name: 'Profesionales', starter: '1', pro: '1', business: '5', elite: 'Ilimitados' },
        { name: 'Sucursales', starter: '1', pro: '1', business: '3', elite: 'Ilimitadas' },
        { name: 'Usuarios y Roles', starter: '1 (Dueño)', pro: '2 (Dueño + Recep)', business: 'Staff Intermedio', elite: 'Staff Completo' }
      ]
    },
    {
      category: 'Comunicación y WhatsApp',
      features: [
        { name: 'Notificaciones Email', starter: '✅', pro: '✅', business: '✅', elite: '✅' },
        { name: 'Recordatorios WhatsApp', starter: '❌', pro: '❌', business: '300 / mes (*)', elite: '1.000 / mes (*)' },
        { name: 'Remitente WhatsApp', starter: '❌', pro: '❌', business: 'Axenda', elite: 'Propio o Axenda' },
        { name: 'Plantillas Personalizadas', starter: '❌', pro: '❌', business: '❌', elite: '✅' }
      ]
    },
    {
      category: 'Herramientas de Crecimiento',
      features: [
        { name: 'Pagos con Mercado Pago', starter: '❌', pro: '✅', business: '✅', elite: '✅' },
        { name: 'Reseñas en Google', starter: '❌', pro: '✅ (Email)', business: '✅ (Email o WhatsApp)', elite: '✅ (Email o WhatsApp)' },
        { name: 'Reportes y Analítica', starter: '❌', pro: '✅', business: '✅', elite: '✅' },
        { name: 'Personalización de Marca', starter: 'Básica', pro: 'Full', business: 'Full', elite: 'Full + Marca Blanca' }
      ]
    }
  ];
}
