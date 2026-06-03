import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SubscriptionService } from '@core/services/subscription.service';

@Component({
  selector: 'app-pricing-comparison',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="comparison-shell bg-bg-primary min-h-screen pt-32 pb-24 px-4 overflow-hidden relative">
      <!-- Glows -->
      <div class="glow-bg top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10"></div>
      <div class="glow-bg bottom-[0%] right-[-10%] w-[40%] h-[40%] bg-accent/5"></div>

      <div class="max-w-6xl mx-auto relative z-10">
        <!-- Header -->
        <div class="text-center mb-16">
          <div class="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-6">
            Comparativa Detallada
          </div>
          <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Elegí el plan <span class="text-gradient">perfecto</span></h1>
          <p class="text-text-muted max-w-2xl mx-auto text-lg">
            Analizá cada característica de nuestros planes y descubrí por qué Axenda es la mejor inversión para tu negocio.
          </p>
        </div>

        <!-- Comparison Table -->
        <div class="glass !p-0 rounded-[2.5rem] overflow-hidden border border-border shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-subtle">
                  <th class="p-8 text-sm font-bold uppercase tracking-widest text-text-dim w-1/4">Funcionalidad</th>
                  <th class="p-8 text-center w-1/5">
                    <span class="block text-lg font-bold text-text-main mb-1">Starter</span>
                    <span class="block text-xs text-text-muted">$0</span>
                  </th>
                  <th class="p-8 text-center w-1/5 border-x border-border bg-primary-glow">
                    <span class="block text-lg font-bold text-primary mb-1">Pro</span>
                    <span class="block text-xs text-text-main font-bold">\${{ proPriceMonthly() | number:'1.0-0' }}/mes</span>
                    <span class="block text-[10px] text-text-muted mt-0.5">\${{ proPriceYearlyMonthly() | number:'1.0-0' }}/mes anual</span>
                  </th>
                  <th class="p-8 text-center w-1/5">
                    <span class="block text-lg font-bold text-text-main mb-1">Business</span>
                    <span class="block text-xs text-text-main font-bold">\${{ businessPriceMonthly() | number:'1.0-0' }}/mes</span>
                    <span class="block text-[10px] text-text-muted mt-0.5">\${{ businessPriceYearlyMonthly() | number:'1.0-0' }}/mes anual</span>
                  </th>
                  <th class="p-8 text-center w-1/5">
                    <span class="block text-lg font-bold text-accent mb-1">Elite</span>
                    <span class="block text-xs text-text-main font-bold">\${{ elitePriceMonthly() | number:'1.0-0' }}/mes</span>
                    <span class="block text-[10px] text-text-muted mt-0.5">\${{ elitePriceYearlyMonthly() | number:'1.0-0' }}/mes anual</span>
                  </th>
                </tr>
              </thead>
              
              @for (group of comparisonData; track group.category) {
                <tbody>
                  <tr>
                    <td colspan="5" class="p-6 bg-surface-subtle text-xs font-black uppercase tracking-[0.2em] text-primary border-y border-border">
                      {{ group.category }}
                    </td>
                  </tr>
                  @for (row of group.features; track row.name) {
                    <tr class="hover:bg-surface-subtle transition-colors border-b border-border last:border-0">
                      <td class="p-6 pl-8 text-sm font-medium text-text-main">{{ row.name }}</td>
                      <td class="p-6 text-center text-sm text-text-muted">{{ row.starter }}</td>
                      <td class="p-6 text-center text-sm text-text-main font-semibold border-x border-border bg-primary-glow">{{ row.pro }}</td>
                      <td class="p-6 text-center text-sm text-text-muted">{{ row.business }}</td>
                      <td class="p-6 text-center text-sm text-text-muted">{{ row.elite }}</td>
                    </tr>
                  }
                </tbody>
              }
              
              <tfoot>
                <tr class="bg-surface-subtle">
                  <td class="p-8"></td>
                  <td class="p-8 text-center">
                    <a routerLink="/register" class="btn-secondary !py-2.5 !text-xs !px-6">Empezar</a>
                  </td>
                  <td class="p-8 text-center border-x border-border bg-primary-glow">
                    <a routerLink="/register" class="btn-primary !py-2.5 !text-xs !px-6 shadow-lg shadow-primary/20">Elegir Pro</a>
                  </td>
                  <td class="p-8 text-center">
                    <a routerLink="/register" class="btn-secondary !py-2.5 !text-xs !px-6">Elegir Business</a>
                  </td>
                  <td class="p-8 text-center">
                    <a routerLink="/register" class="btn-secondary !py-2.5 !text-xs !px-6">Elegir Elite</a>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Footnote -->
        <div class="mt-4 px-4 text-[10px] text-text-muted text-center md:text-left">
          (*) Los límites de WhatsApp son ampliables mediante paquetes de mensajes adicionales.
        </div>

        <!-- Back Link -->
        <div class="mt-12 text-center">
          <a routerLink="/" class="text-primary hover:text-primary-light flex items-center justify-center gap-2 font-semibold transition-all">
            <app-icon name="arrow_back"></app-icon>
            Volver a la página principal
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comparison-shell {
      background-color: var(--color-bg-primary);
      color: var(--color-text-main);
    }
    .glow-bg {
      position: absolute;
      filter: blur(120px);
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
    }
    .glass {
      background: var(--color-glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--color-glass-border);
    }
    table td, table th {
      vertical-align: middle;
    }
    .overflow-x-auto::-webkit-scrollbar {
      height: 6px;
    }
    .overflow-x-auto::-webkit-scrollbar-track {
      background: transparent;
    }
    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: var(--color-surface-subtle-hover);
      border-radius: 10px;
    }
    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: var(--color-text-dim);
    }
    @media (max-width: 768px) {
      .pricing-card {
        padding: 1.5rem !important;
      }
    }
  `]
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
