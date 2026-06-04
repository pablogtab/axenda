import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    SelectModule,
    CardModule,
  ],
  template: `
    <div class="tenants-container">
      <p-card header="Gestión de Cuentas (Tenants)" styleClass="page-card">
        <!-- Search & Actions -->
        <div class="table-header-actions">
          <span class="p-input-icon-left search-container">
            <i class="pi pi-search search-icon"></i>
            <input
              type="text"
              pInputText
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              placeholder="Buscar por nombre, email o slug..."
              class="w-full search-input"
            />
          </span>
          <p-button label="Limpiar" icon="pi pi-filter-slash" styleClass="p-button-outlined" (click)="clearSearch()"></p-button>
        </div>

        <!-- Tenants Table -->
        <p-table
          [value]="tenants()"
          [lazy]="true"
          (onLazyLoad)="loadTenantsLazy($event)"
          [paginator]="true"
          [rows]="limit()"
          [totalRecords]="totalRecords()"
          [loading]="isLoading()"
          [rowsPerPageOptions]="[5, 10, 20, 50]"
          styleClass="p-datatable-gridlines mt-4 admin-table"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Negocio</th>
              <th>Contacto / Slug</th>
              <th>Suscripción Activa</th>
              <th>Métricas</th>
              <th>Fecha Registro</th>
              <th style="width: 150px">Acciones</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-tenant>
            <tr>
              <td>
                <span class="tenant-name">{{ tenant.name }}</span>
                <span class="tenant-id-label">ID: {{ tenant.id }}</span>
              </td>
              <td>
                <div class="contact-info">
                  <span class="contact-email">{{ tenant.email || 'Sin email' }}</span>
                  <span class="contact-slug">Slug: <strong>{{ tenant.publicSlug || tenant.slug }}</strong></span>
                </div>
              </td>
              <td>
                <div *ngIf="tenant.subscription; else noSub" class="sub-badge-container">
                  <span class="sub-plan-badge">{{ tenant.subscription.plan.name }}</span>
                  <span class="sub-billing-cycle">Facturación: {{ tenant.subscription.billingCycle }}</span>
                  <span class="sub-status" [ngClass]="tenant.subscription.status.toLowerCase()">
                    {{ tenant.subscription.status }}
                  </span>
                  <span class="sub-date" *ngIf="tenant.subscription.endDate">
                    Vence: {{ tenant.subscription.endDate | date:'dd/MM/yyyy' }}
                  </span>
                </div>
                <ng-template #noSub>
                  <span class="sub-status canceled">Sin Suscripción</span>
                </ng-template>
              </td>
              <td>
                <div class="stats-info">
                  <span>Profesionales: <strong>{{ tenant._count.professionals }}</strong></span>
                  <span>Turnos: <strong>{{ tenant._count.appointments }}</strong></span>
                  <span>Usuarios: <strong>{{ tenant._count.users }}</strong></span>
                </div>
              </td>
              <td>{{ tenant.createdAt | date:'dd/MM/yyyy HH:mm' }} hs</td>
              <td>
                <div class="row-actions">
                  <p-button
                    label="Suscripción"
                    icon="pi pi-cog"
                    styleClass="p-button-sm p-button-secondary"
                    (click)="openEditSubscription(tenant)"
                  ></p-button>
                  <p-button
                    label="Apersonarme"
                    icon="pi pi-sign-in"
                    styleClass="p-button-sm p-button-success"
                    [loading]="impersonatingTenantId() === tenant.id"
                    (click)="impersonateTenant(tenant)"
                  ></p-button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center p-4">No se encontraron negocios registrados.</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Edit Subscription Dialog -->
      <p-dialog
        header="Modificar Suscripción Manualmente"
        [(visible)]="displayDialog"
        [modal]="true"
        [style]="{ width: '450px' }"
        styleClass="admin-dialog"
      >
        <div *ngIf="selectedTenant()" class="dialog-content">
          <div class="dialog-info-box">
            <span class="dialog-info-label">Negocio:</span>
            <span class="dialog-info-val">{{ selectedTenant()?.name }}</span>
          </div>

          <div class="form-field">
            <label for="plan">Plan</label>
            <p-select
              id="plan"
              [options]="plans"
              [(ngModel)]="editData.planCode"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
            ></p-select>
          </div>

          <div class="form-field">
            <label for="cycle">Ciclo de Facturación</label>
            <p-select
              id="cycle"
              [options]="billingCycles"
              [(ngModel)]="editData.billingCycle"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
            ></p-select>
          </div>

          <div class="form-field">
            <label for="status">Estado</label>
            <p-select
              id="status"
              [options]="statuses"
              [(ngModel)]="editData.status"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
            ></p-select>
          </div>

          <div class="form-field">
            <label for="endDate">Fecha de Vencimiento (Opcional)</label>
            <input
              id="endDate"
              type="date"
              [(ngModel)]="editData.endDate"
              class="w-full date-input"
            />
          </div>

          <div class="dialog-actions">
            <p-button label="Cancelar" styleClass="p-button-text p-button-secondary" (click)="closeDialog()"></p-button>
            <p-button label="Guardar" icon="pi pi-check" styleClass="p-button-primary" [loading]="isSaving()" (click)="saveSubscription()"></p-button>
          </div>
        </div>
      </p-dialog>
    </div>
  `,
  styles: [`
    .tenants-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    ::ng-deep .page-card {
      background-color: #1e293b !important;
      border: 1px solid #334155;
      border-radius: 12px;
      color: #ffffff !important;
    }
    ::ng-deep .page-card .p-card-title {
      color: #ffffff;
      font-weight: 800;
    }
    .table-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .search-container {
      position: relative;
      flex: 1;
      max-width: 450px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
    }
    .search-input {
      background-color: #0f172a !important;
      color: #ffffff !important;
      border: 1px solid #334155 !important;
      padding: 0.75rem 0.75rem 0.75rem 2.25rem !important;
      border-radius: 8px !important;
    }
    ::ng-deep .admin-table {
      border: 1px solid #334155 !important;
      background-color: #1e293b !important;
    }
    ::ng-deep .admin-table th {
      background-color: #0f172a !important;
      color: #94a3b8 !important;
      border: 1px solid #334155 !important;
      padding: 1rem !important;
      font-weight: 700 !important;
    }
    ::ng-deep .admin-table td {
      background-color: #1e293b !important;
      color: #e2e8f0 !important;
      border: 1px solid #334155 !important;
      padding: 1rem !important;
    }
    ::ng-deep .admin-table tr:hover td {
      background-color: #334155 !important;
    }
    .tenant-name {
      display: block;
      font-weight: 700;
      color: #ffffff;
      font-size: 1rem;
    }
    .tenant-id-label {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.125rem;
    }
    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .contact-email {
      font-weight: 500;
      color: #3b82f6;
    }
    .contact-slug {
      font-size: 0.825rem;
      color: #94a3b8;
    }
    .sub-badge-container {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .sub-plan-badge {
      font-weight: 800;
      color: #ffffff;
    }
    .sub-billing-cycle {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .sub-status {
      display: inline-block;
      align-self: flex-start;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sub-status.active {
      background-color: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .sub-status.trialing {
      background-color: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    .sub-status.past_due {
      background-color: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .sub-status.canceled {
      background-color: rgba(148, 163, 184, 0.1);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .sub-date {
      font-size: 0.75rem;
      color: #ef4444;
      font-weight: 600;
      margin-top: 0.125rem;
    }
    .stats-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      font-size: 0.825rem;
      color: #94a3b8;
    }
    .row-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: stretch;
    }
    ::ng-deep .p-paginator {
      background-color: #0f172a !important;
      border: 1px solid #334155 !important;
      border-top: none !important;
      color: #94a3b8 !important;
    }
    ::ng-deep .p-paginator .p-paginator-page,
    ::ng-deep .p-paginator .p-paginator-next,
    ::ng-deep .p-paginator .p-paginator-last,
    ::ng-deep .p-paginator .p-paginator-first,
    ::ng-deep .p-paginator .p-paginator-prev {
      color: #94a3b8 !important;
      min-width: 2rem !important;
      height: 2rem !important;
      border-radius: 6px !important;
    }
    ::ng-deep .p-paginator .p-paginator-page.p-highlight {
      background-color: #3b82f6 !important;
      color: #ffffff !important;
    }
    ::ng-deep .p-paginator .p-dropdown {
      background-color: #1e293b !important;
      border: 1px solid #334155 !important;
      color: #ffffff !important;
    }
    ::ng-deep .admin-dialog {
      background-color: #1e293b !important;
      color: #ffffff !important;
      border: 1px solid #334155 !important;
      border-radius: 12px !important;
    }
    ::ng-deep .admin-dialog .p-dialog-header {
      background-color: #1e293b !important;
      color: #ffffff !important;
      border-bottom: 1px solid #334155 !important;
      padding: 1.5rem !important;
    }
    ::ng-deep .admin-dialog .p-dialog-content {
      background-color: #1e293b !important;
      color: #ffffff !important;
      padding: 1.5rem !important;
    }
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .dialog-info-box {
      background-color: #0f172a;
      border: 1px solid #334155;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      display: flex;
      gap: 1rem;
    }
    .dialog-info-label {
      color: #94a3b8;
      font-weight: 600;
    }
    .dialog-info-val {
      font-weight: 800;
      color: #ffffff;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-field label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #94a3b8;
    }
    ::ng-deep .admin-dialog p-select .p-select {
      background-color: #0f172a !important;
      color: #ffffff !important;
      border: 1px solid #334155 !important;
    }
    ::ng-deep .admin-dialog p-select .p-select-panel {
      background-color: #0f172a !important;
      border: 1px solid #334155 !important;
    }
    ::ng-deep .admin-dialog p-select .p-select-option,
    ::ng-deep .admin-dialog p-select .p-dropdown-item {
      color: #e2e8f0 !important;
    }
    ::ng-deep .admin-dialog p-select .p-select-option.p-select-option-selected,
    ::ng-deep .admin-dialog p-select .p-dropdown-item.p-highlight {
      background-color: #3b82f6 !important;
      color: #ffffff !important;
    }
    .date-input {
      background-color: #0f172a !important;
      color: #ffffff !important;
      border: 1px solid #334155 !important;
      border-radius: 6px !important;
      padding: 0.5rem !important;
      font-size: 0.875rem !important;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  `],
})
export class TenantsComponent implements OnInit {
  private adminService = inject(AdminService);

  // Table state
  tenants = signal<any[]>([]);
  totalRecords = signal<number>(0);
  isLoading = signal<boolean>(false);
  limit = signal<number>(10);
  page = signal<number>(1);
  searchQuery = '';

  // Dialog state
  displayDialog = false;
  selectedTenant = signal<any | null>(null);
  isSaving = signal<boolean>(false);
  impersonatingTenantId = signal<string | null>(null);

  // Form selections
  plans = [
    { label: 'Starter (Gratuito)', value: 'STARTER' },
    { label: 'Pro (Mensual/Anual)', value: 'PRO' },
    { label: 'Business (Mensual/Anual)', value: 'BUSINESS' },
    { label: 'Elite (Mensual/Anual)', value: 'ELITE' },
  ];

  billingCycles = [
    { label: 'Mensual', value: 'MONTHLY' },
    { label: 'Anual', value: 'YEARLY' },
  ];

  statuses = [
    { label: 'Activo (ACTIVE)', value: 'ACTIVE' },
    { label: 'Prueba (TRIALING)', value: 'TRIALING' },
    { label: 'Pago Atrasado (PAST_DUE)', value: 'PAST_DUE' },
    { label: 'Cancelado (CANCELED)', value: 'CANCELED' },
    { label: 'Inactivo (INACTIVE)', value: 'INACTIVE' },
  ];

  editData = {
    planCode: 'PRO',
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    status: 'ACTIVE',
    endDate: '' as string | null,
  };

  private searchTimeout: any;

  ngOnInit(): void {
    // Inicialización estándar
  }

  loadTenants(): void {
    this.isLoading.set(true);
    this.adminService
      .getTenants(this.searchQuery, this.page(), this.limit())
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res?.data) {
            this.tenants.set(res.data.data || []);
            this.totalRecords.set(res.data.total || 0);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error fetching tenants', err);
        },
      });
  }

  loadTenantsLazy(event: any): void {
    const rows = event.rows || 10;
    const pageNum = Math.floor((event.first || 0) / rows) + 1;

    this.limit.set(rows);
    this.page.set(pageNum);
    this.loadTenants();
  }

  onSearch(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.loadTenants();
    }, 400); // Debounce
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.page.set(1);
    this.loadTenants();
  }

  openEditSubscription(tenant: any): void {
    this.selectedTenant.set(tenant);

    if (tenant.subscription) {
      this.editData = {
        planCode: tenant.subscription.plan.code,
        billingCycle: tenant.subscription.billingCycle,
        status: tenant.subscription.status,
        endDate: tenant.subscription.endDate
          ? new Date(tenant.subscription.endDate).toISOString().split('T')[0]
          : '',
      };
    } else {
      this.editData = {
        planCode: 'PRO',
        billingCycle: 'MONTHLY',
        status: 'ACTIVE',
        endDate: '',
      };
    }

    this.displayDialog = true;
  }

  closeDialog(): void {
    this.displayDialog = false;
    this.selectedTenant.set(null);
  }

  saveSubscription(): void {
    const tenant = this.selectedTenant();
    if (!tenant) return;

    this.isSaving.set(true);
    const postData = {
      planCode: this.editData.planCode,
      billingCycle: this.editData.billingCycle,
      status: this.editData.status,
      endDate: this.editData.endDate ? new Date(this.editData.endDate).toISOString() : null,
    };

    this.adminService.overrideSubscription(tenant.id, postData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.displayDialog = false;
        this.loadTenants();
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Error saving subscription override', err);
      },
    });
  }

  impersonateTenant(tenant: any): void {
    if (!tenant?.id) return;

    // Abrir ventana en blanco sincrónicamente (evita bloqueo de popup del browser)
    const newWindow = window.open('', '_blank');
    if (!newWindow) return;

    this.impersonatingTenantId.set(tenant.id);
    this.adminService.impersonateTenant(tenant.id).subscribe({
      next: (res) => {
        this.impersonatingTenantId.set(null);
        const redirectUrl = res?.data?.redirectUrl;
        if (!redirectUrl) {
          newWindow.close();
          console.error('No se recibió redirectUrl para impersonación');
          return;
        }
        newWindow.location.href = redirectUrl;
      },
      error: (err) => {
        this.impersonatingTenantId.set(null);
        newWindow.close();
        console.error('Error impersonando tenant', err);
      },
    });
  }
}
