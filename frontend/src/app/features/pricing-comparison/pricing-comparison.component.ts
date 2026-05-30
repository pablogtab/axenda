import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SubscriptionService } from '@core/services/subscription.service';

@Component({
  selector: 'app-pricing-comparison',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './pricing-comparison.component.html',
  styleUrl: './pricing-comparison.component.css'
})
export class PricingComparisonComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);

  // Precios dinámicos con fallbacks
  proPriceMonthly = signal<number>(15000);
  proPriceYearlyMonthly = signal<number>(12000);

  businessPriceMonthly = signal<number>(24500);
  businessPriceYearlyMonthly = signal<number>(19600);

  elitePriceMonthly = signal<number>(48000);
  elitePriceYearlyMonthly = signal<number>(38400);

  ngOnInit() {
    this.loadPlans();
  }

  async loadPlans() {
    try {
      const plans = await this.subscriptionService.getPlans();
      
      const pro = plans.find(p => p.code === 'PRO');
      if (pro) {
        this.proPriceMonthly.set(Number(pro.priceMonthly));
        this.proPriceYearlyMonthly.set(Number(pro.priceYearly) / 12);
      }

      const business = plans.find(p => p.code === 'BUSINESS');
      if (business) {
        this.businessPriceMonthly.set(Number(business.priceMonthly));
        this.businessPriceYearlyMonthly.set(Number(business.priceYearly) / 12);
      }

      const elite = plans.find(p => p.code === 'ELITE');
      if (elite) {
        this.elitePriceMonthly.set(Number(elite.priceMonthly));
        this.elitePriceYearlyMonthly.set(Number(elite.priceYearly) / 12);
      }
    } catch (error) {
      console.error('Error fetching plans in comparison page', error);
    }
  }
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
        { name: 'Recordatorios WhatsApp', starter: '❌', pro: '100 WhatsApps / mes (*)', business: '300 WhatsApps / mes (*)', elite: '1.000 WhatsApps / mes (*)' },
        { name: 'Remitente WhatsApp', starter: '❌', pro: 'Axenda', business: 'Axenda', elite: 'Propio o Axenda' },
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
