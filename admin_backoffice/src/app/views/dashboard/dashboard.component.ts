import { Component, OnInit, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, CardModule, ChartModule],
  template: `
    <div class="dashboard-container">
      <!-- Grilla 3x3 de Métricas -->
      <div class="metrics-grid">
        <!-- MRR -->
        <p-card styleClass="metric-card mrr-card">
          <div class="metric-content">
            <span class="metric-label">MRR Estimado</span>
            <span class="metric-value">$ {{ metrics().estimatedMrr | number:'1.0-0' }}</span>
            <span class="metric-helper">Ingresos recurrentes mensuales</span>
          </div>
          <i class="pi pi-dollar metric-icon mrr-icon"></i>
        </p-card>

        <!-- Total Tenants -->
        <p-card styleClass="metric-card">
          <div class="metric-content">
            <span class="metric-label">Negocios Registrados</span>
            <span class="metric-value">{{ metrics().totalTenants }}</span>
            <span class="metric-helper">Cuentas totales creadas</span>
          </div>
          <i class="pi pi-briefcase metric-icon"></i>
        </p-card>

        <!-- Active Subscriptions -->
        <p-card styleClass="metric-card">
          <div class="metric-content">
            <span class="metric-label">Suscripciones Activas</span>
            <span class="metric-value">{{ metrics().activeSubscriptions }}</span>
            <span class="metric-helper">Planes de pago vigentes</span>
          </div>
          <i class="pi pi-check-circle metric-icon text-success"></i>
        </p-card>

        <!-- Trialing Subscriptions -->
        <p-card styleClass="metric-card">
          <div class="metric-content">
            <span class="metric-label">Periodos de Prueba</span>
            <span class="metric-value">{{ metrics().trialingSubscriptions }}</span>
            <span class="metric-helper">Suscripciones trialing activas</span>
          </div>
          <i class="pi pi-clock metric-icon text-warning"></i>
        </p-card>

        <!-- Total Appointments -->
        <p-card styleClass="metric-card">
          <div class="metric-content">
            <span class="metric-label">Turnos Reservados</span>
            <span class="metric-value">{{ metrics().totalAppointments }}</span>
            <span class="metric-helper">Reservas totales históricas</span>
          </div>
          <i class="pi pi-calendar metric-icon"></i>
        </p-card>

        <!-- Total WhatsApp Sent -->
        <p-card styleClass="metric-card">
          <div class="metric-content">
            <span class="metric-label">Mensajes WhatsApp</span>
            <span class="metric-value">{{ metrics().totalWhatsappSent }}</span>
            <span class="metric-helper">Mensajes enviados este mes</span>
          </div>
          <i class="pi pi-whatsapp metric-icon text-success-alt"></i>
        </p-card>

        <!-- Total Users -->
        <p-card styleClass="metric-card">
          <div class="metric-content">
            <span class="metric-label">Usuarios Totales</span>
            <span class="metric-value">{{ metrics().totalUsers }}</span>
            <span class="metric-helper">Empleados y administradores</span>
          </div>
          <i class="pi pi-users metric-icon text-info"></i>
        </p-card>

        <!-- Total Professionals -->
        <p-card styleClass="metric-card">
          <div class="metric-content">
            <span class="metric-label">Profesionales</span>
            <span class="metric-value">{{ metrics().totalProfessionals }}</span>
            <span class="metric-helper">Prestadores registrados</span>
          </div>
          <i class="pi pi-user-plus metric-icon text-primary"></i>
        </p-card>

        <!-- Total Services -->
        <p-card styleClass="metric-card">
          <div class="metric-content">
            <span class="metric-label">Servicios Ofrecidos</span>
            <span class="metric-value">{{ metrics().totalServices }}</span>
            <span class="metric-helper">Servicios totales creados</span>
          </div>
          <i class="pi pi-cog metric-icon"></i>
        </p-card>
      </div>

      <!-- Gráfico de Ventas por Semana (Solo si hay ventas en el último año) -->
      <div class="sales-section" *ngIf="metrics().weeklySales && metrics().weeklySales.length > 0">
        <h2 class="section-title">Rendimiento de Ventas por Semana (Último Año)</h2>
        <div class="chart-wrapper">
          <p-chart type="bar" [data]="chartData" [options]="chartOptions" height="350px"></p-chart>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    @media (max-width: 1024px) {
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 640px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
    }
    .metric-card {
      background-color: #1e293b !important;
      border: 1px solid #334155;
      border-radius: 12px;
      color: #ffffff !important;
      position: relative;
      overflow: hidden;
    }
    .metric-card .p-card-body {
      padding: 1.5rem !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mrr-card {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%) !important;
      border-color: #2563eb;
    }
    .metric-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .metric-label {
      font-size: 0.875rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .mrr-card .metric-label {
      color: #93c5fd;
    }
    .metric-value {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.05em;
      line-height: 1;
      margin: 0.25rem 0;
    }
    .metric-helper {
      font-size: 0.75rem;
      color: #64748b;
    }
    .mrr-card .metric-helper {
      color: #60a5fa;
    }
    .metric-icon {
      font-size: 2.5rem;
      color: #475569;
    }
    .mrr-icon {
      color: #3b82f6;
    }
    .text-success {
      color: #10b981;
    }
    .text-success-alt {
      color: #22c55e;
    }
    .text-warning {
      color: #f59e0b;
    }
    .text-info {
      color: #06b6d4;
    }
    .text-primary {
      color: #3b82f6;
    }

    /* Sales Section Styling */
    .sales-section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      border-left: 4px solid #3b82f6;
      padding-left: 0.75rem;
    }
    .chart-wrapper {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.5rem;
    }
  `],
})
export class DashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  metrics = signal<any>({
    totalTenants: 0,
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    totalAppointments: 0,
    totalWhatsappSent: 0,
    estimatedMrr: 0,
    totalUsers: 0,
    totalProfessionals: 0,
    totalServices: 0,
    weeklySales: [],
  });

  chartData: any;
  chartOptions: any;

  ngOnInit(): void {
    this.adminService.getMetrics().subscribe({
      next: (res) => {
        if (res?.data) {
          this.metrics.set(res.data);
          this.initChart(res.data.weeklySales || []);
        }
      },
      error: (err) => {
        console.error('Error fetching metrics', err);
      },
    });
  }

  initChart(weeklySales: any[]): void {
    const labels = weeklySales.map(item => `Semana ${item.week}`);
    const salesCounts = weeklySales.map(item => item.salesCount);
    const revenues = weeklySales.map(item => item.revenue);

    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Ingresos ($)',
          data: revenues,
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 1,
          yAxisID: 'yRevenue',
          barPercentage: 0.15,
          categoryPercentage: 0.3,
          maxBarThickness: 12,
        },
        {
          label: 'Cantidad de Ventas',
          data: salesCounts,
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          borderWidth: 1,
          type: 'line',
          yAxisID: 'yCount',
          fill: false,
          tension: 0.4
        }
      ]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          grid: {
            color: '#334155',
            drawOnChartArea: true
          },
          ticks: {
            color: '#94a3b8'
          }
        },
        yRevenue: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8',
            callback: (value: any) => '$' + value
          },
          title: {
            display: true,
            text: 'Facturación ($)',
            color: '#94a3b8'
          }
        },
        yCount: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: '#94a3b8',
            stepSize: 1
          },
          title: {
            display: true,
            text: 'Cant. Transacciones',
            color: '#94a3b8'
          }
        }
      }
    };
  }
}
