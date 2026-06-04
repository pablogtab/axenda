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
  selector: 'app-coupons',
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
    <div class="coupons-container">
      <p-card header="Gestión de Cupones y Descuentos" styleClass="page-card">
        <!-- Header Actions -->
        <div class="table-header-actions">
          <span class="table-subtitle">Listado de códigos promocionales activos e históricos</span>
          <p-button 
            label="Nuevo Cupón" 
            icon="pi pi-plus" 
            styleClass="p-button-primary"
            (click)="openCreateDialog()"
          ></p-button>
        </div>

        <!-- Coupons Table -->
        <p-table 
          [value]="coupons()" 
          [loading]="isLoading()"
          styleClass="p-datatable-gridlines mt-4 admin-table"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Código</th>
              <th>Descuento</th>
              <th>Uso / Límite</th>
              <th>Reglas</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th style="width: 180px">Acciones</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-coupon>
            <tr>
              <td>
                <strong class="coupon-code">{{ coupon.code }}</strong>
                <div *ngIf="coupon.referrer" class="coupon-referrer-info mt-1">
                  <i class="pi pi-user text-xs"></i>
                  <span class="referrer-name">{{ coupon.referrer.firstName }} {{ coupon.referrer.lastName }}</span>
                  <span class="referrer-email">({{ coupon.referrer.email }})</span>
                </div>
              </td>
              <td>
                <span class="discount-percent">{{ coupon.discountPercent | number:'1.0-2' }} %</span>
              </td>
              <td>
                <div class="uses-info">
                  <span>Usado: <strong>{{ coupon.usesCount }}</strong></span>
                  <span *ngIf="coupon.maxUses">Límite: <strong>{{ coupon.maxUses }}</strong></span>
                  <span *ngIf="!coupon.maxUses" class="text-muted">Límite: <strong>Ilimitado</strong></span>
                </div>
              </td>
              <td>
                <div class="rules-info">
                  <span *ngIf="coupon.applicablePlanCode">Plan: <strong>{{ coupon.applicablePlanCode }}</strong></span>
                  <span *ngIf="!coupon.applicablePlanCode">Plan: <strong>Todos</strong></span>
                  <span>Pago: <strong>{{ coupon.onlyFirstPayment ? 'Solo 1er Pago' : 'Todos los pagos' }}</strong></span>
                </div>
              </td>
              <td>
                <span *ngIf="coupon.expiresAt">{{ coupon.expiresAt | date:'dd/MM/yyyy HH:mm' }} hs</span>
                <span *ngIf="!coupon.expiresAt" class="text-muted">Nunca expira</span>
              </td>
              <td>
                <span class="status-dot" [ngClass]="{ active: coupon.active }"></span>
                <span class="status-label">{{ coupon.active ? 'Activo' : 'Inactivo' }}</span>
              </td>
              <td>
                <div class="actions-group">
                  <p-button 
                    icon="pi pi-pencil" 
                    styleClass="p-button-sm p-button-secondary p-button-outlined"
                    (click)="openEditDialog(coupon)"
                  ></p-button>
                  <p-button 
                    icon="pi pi-power-off" 
                    [styleClass]="coupon.active ? 'p-button-sm p-button-warning' : 'p-button-sm p-button-success'"
                    (click)="toggleStatus(coupon)"
                  ></p-button>
                  <p-button 
                    icon="pi pi-trash" 
                    styleClass="p-button-sm p-button-danger"
                    (click)="deleteCoupon(coupon)"
                  ></p-button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center p-4">No hay cupones registrados. Hacé clic en "Nuevo Cupón" para comenzar.</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Coupon Editor Dialog -->
      <p-dialog 
        [header]="isEditMode ? 'Editar Cupón' : 'Nuevo Cupón del Sistema'" 
        [(visible)]="displayDialog" 
        [modal]="true" 
        [style]="{ width: '450px' }"
        styleClass="admin-dialog"
      >
        <div class="dialog-content">
          <div class="form-field" *ngIf="!isEditMode">
            <label for="code">Código de Cupón</label>
            <input 
              id="code" 
              type="text" 
              pInputText 
              [(ngModel)]="editData.code" 
              name="code" 
              required
              class="w-full"
              placeholder="Ej: DESCUENTO30"
              style="text-transform: uppercase;"
            />
          </div>

          <div class="form-field">
            <label for="percent">Porcentaje de Descuento (%)</label>
            <input 
              id="percent" 
              type="number" 
              pInputText 
              [(ngModel)]="editData.discountPercent" 
              name="percent" 
              required
              min="1"
              max="100"
              class="w-full"
              placeholder="Ej: 15"
            />
          </div>

          <div class="form-field">
            <label for="maxUses">Límite de Usos Totales (Opcional)</label>
            <input 
              id="maxUses" 
              type="number" 
              pInputText 
              [(ngModel)]="editData.maxUses" 
              name="maxUses"
              min="1"
              class="w-full"
              placeholder="Ej: 100 (vacío para ilimitado)"
            />
          </div>

          <div class="form-field">
            <label for="plan">Restringido a Plan (Opcional)</label>
            <p-select 
              id="plan" 
              [options]="plans" 
              [(ngModel)]="editData.applicablePlanCode" 
              optionLabel="label" 
              optionValue="value"
              styleClass="w-full"
            ></p-select>
          </div>

          <div class="form-field">
            <label for="expiresAt">Fecha de Expiración (Opcional)</label>
            <input 
              id="expiresAt" 
              type="datetime-local" 
              [(ngModel)]="editData.expiresAt" 
              class="w-full date-input"
            />
          </div>

          <div class="form-field" style="position: relative; margin-bottom: 1.25rem;">
            <label>Asignar a Usuario Particular (Opcional)</label>
            <div *ngIf="selectedReferrerUser()" class="selected-user-box">
              <span>👤 <strong>{{ selectedReferrerUser()?.firstName }} {{ selectedReferrerUser()?.lastName }}</strong> ({{ selectedReferrerUser()?.email }})</span>
              <p-button icon="pi pi-times" styleClass="p-button-text p-button-danger p-button-sm" (click)="clearReferrerUser()"></p-button>
            </div>
            
            <div *ngIf="!selectedReferrerUser()">
              <input 
                type="text" 
                pInputText 
                [(ngModel)]="userSearchQuery" 
                (input)="onSearchUsers()"
                placeholder="Escribí nombre o email para buscar..." 
                class="w-full"
              />
              <ul *ngIf="userSearchResults().length > 0" class="search-results-list">
                <li *ngFor="let u of userSearchResults()" (click)="selectReferrerUser(u)">
                  {{ u.firstName }} {{ u.lastName }} ({{ u.email }}) - {{ u.tenant?.name }}
                </li>
              </ul>
            </div>
          </div>

          <div class="checkbox-field">
            <input 
              id="onlyFirst" 
              type="checkbox" 
              [(ngModel)]="editData.onlyFirstPayment" 
            />
            <label for="onlyFirst">Aplicar sólo en el primer pago de la suscripción</label>
          </div>

          <div class="checkbox-field">
            <input 
              id="active" 
              type="checkbox" 
              [(ngModel)]="editData.active" 
            />
            <label for="active">Cupón activo al guardar</label>
          </div>

          <div class="dialog-actions">
            <p-button label="Cancelar" styleClass="p-button-text p-button-secondary" (click)="closeDialog()"></p-button>
            <p-button label="Guardar" icon="pi pi-check" styleClass="p-button-primary" [loading]="isSaving()" (click)="saveCoupon()"></p-button>
          </div>
        </div>
      </p-dialog>
    </div>
  `,
  styles: [`
    .coupons-container {
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
      margin-top: 1rem;
    }
    .table-subtitle {
      color: #94a3b8;
      font-size: 0.875rem;
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
    .coupon-code {
      font-size: 1.125rem;
      color: #60a5fa;
      font-family: monospace;
      letter-spacing: 0.05em;
    }
    .discount-percent {
      font-size: 1.125rem;
      font-weight: 800;
      color: #10b981;
    }
    .type-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .type-badge.system {
      background-color: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .type-badge.referral {
      background-color: rgba(167, 139, 250, 0.1);
      color: #a78bfa;
      border: 1px solid rgba(167, 139, 250, 0.2);
    }
    .uses-info, .rules-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      font-size: 0.825rem;
      color: #94a3b8;
    }
    .text-muted {
      color: #64748b;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ef4444;
      margin-right: 0.5rem;
    }
    .status-dot.active {
      background-color: #10b981;
    }
    .status-label {
      font-size: 0.875rem;
      font-weight: 600;
    }
    .actions-group {
      display: flex;
      gap: 0.5rem;
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
    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-field input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    .checkbox-field label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
      cursor: pointer;
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
    input[type="text"], input[type="number"] {
      background-color: #0f172a !important;
      color: #ffffff !important;
      border: 1px solid #334155 !important;
      padding: 0.75rem !important;
      border-radius: 8px !important;
    }
    .selected-user-box {
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: #93c5fd;
    }
    .search-results-list {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0;
      margin: 0.25rem 0 0 0;
      list-style: none;
      max-height: 150px;
      overflow-y: auto;
      position: absolute;
      width: 100%;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
    .search-results-list li {
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-size: 0.825rem;
      color: #e2e8f0;
      transition: background-color 0.2s;
    }
    .search-results-list li:hover {
      background-color: #334155;
    }
    .coupon-referrer-info {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .referrer-name {
      font-weight: 600;
      color: #3b82f6;
    }
    .referrer-email {
      font-style: italic;
      color: #64748b;
    }
  `],
})
export class CouponsComponent implements OnInit {
  private adminService = inject(AdminService);

  coupons = signal<any[]>([]);
  isLoading = signal<boolean>(false);

  // Dialog state
  displayDialog = false;
  isEditMode = false;
  selectedCouponId: string | null = null;
  isSaving = signal<boolean>(false);

  // Referrer User search state
  selectedReferrerUser = signal<any | null>(null);
  userSearchQuery = '';
  userSearchResults = signal<any[]>([]);

  plans = [
    { label: 'Cualquier Plan', value: '' },
    { label: 'Pro', value: 'PRO' },
    { label: 'Business', value: 'BUSINESS' },
    { label: 'Elite', value: 'ELITE' },
  ];

  editData = {
    code: '',
    discountPercent: 10,
    active: true,
    isSystem: true,
    maxUses: '' as number | string,
    expiresAt: '' as string,
    applicablePlanCode: '',
    onlyFirstPayment: true,
    referrerId: '',
  };

  ngOnInit(): void {
    this.loadCoupons();
  }

  loadCoupons(): void {
    this.isLoading.set(true);
    this.adminService.getCoupons().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.coupons.set(res?.data || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error fetching coupons', err);
      },
    });
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.selectedCouponId = null;
    this.selectedReferrerUser.set(null);
    this.userSearchQuery = '';
    this.userSearchResults.set([]);
    this.editData = {
      code: '',
      discountPercent: 10,
      active: true,
      isSystem: true,
      maxUses: '',
      expiresAt: '',
      applicablePlanCode: '',
      onlyFirstPayment: true,
      referrerId: '',
    };
    this.displayDialog = true;
  }

  openEditDialog(coupon: any): void {
    this.isEditMode = true;
    this.selectedCouponId = coupon.id;
    this.selectedReferrerUser.set(coupon.referrer || null);
    this.userSearchQuery = '';
    this.userSearchResults.set([]);
    this.editData = {
      code: coupon.code,
      discountPercent: Number(coupon.discountPercent),
      active: coupon.active,
      isSystem: coupon.isSystem,
      maxUses: coupon.maxUses || '',
      expiresAt: coupon.expiresAt 
        ? new Date(coupon.expiresAt).toISOString().slice(0, 16) 
        : '',
      applicablePlanCode: coupon.applicablePlanCode || '',
      onlyFirstPayment: coupon.onlyFirstPayment,
      referrerId: coupon.referrerId || '',
    };
    this.displayDialog = true;
  }

  closeDialog(): void {
    this.displayDialog = false;
  }

  private userSearchTimeout: any;
  onSearchUsers(): void {
    if (this.userSearchTimeout) clearTimeout(this.userSearchTimeout);
    if (!this.userSearchQuery || this.userSearchQuery.trim().length < 2) {
      this.userSearchResults.set([]);
      return;
    }
    this.userSearchTimeout = setTimeout(() => {
      this.adminService.searchUsers(this.userSearchQuery).subscribe({
        next: (res) => {
          this.userSearchResults.set(res?.data || []);
        },
        error: (err) => console.error('Error searching users', err),
      });
    }, 400);
  }

  selectReferrerUser(u: any): void {
    this.selectedReferrerUser.set(u);
    this.editData.referrerId = u.id;
    this.userSearchQuery = '';
    this.userSearchResults.set([]);
  }

  clearReferrerUser(): void {
    this.selectedReferrerUser.set(null);
    this.editData.referrerId = '';
    this.userSearchQuery = '';
    this.userSearchResults.set([]);
  }

  saveCoupon(): void {
    if (!this.isEditMode && !this.editData.code) return;
    if (this.editData.discountPercent < 1 || this.editData.discountPercent > 100) return;

    this.isSaving.set(true);

    const postData = {
      code: this.editData.code,
      discountPercent: this.editData.discountPercent,
      active: this.editData.active,
      isSystem: this.editData.isSystem,
      maxUses: this.editData.maxUses ? Number(this.editData.maxUses) : null,
      expiresAt: this.editData.expiresAt ? new Date(this.editData.expiresAt).toISOString() : null,
      applicablePlanCode: this.editData.applicablePlanCode || null,
      onlyFirstPayment: this.editData.onlyFirstPayment,
      referrerId: this.editData.referrerId || null,
    };

    const request$ = this.isEditMode && this.selectedCouponId
      ? this.adminService.updateCoupon(this.selectedCouponId, postData)
      : this.adminService.createCoupon(postData);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.displayDialog = false;
        this.loadCoupons();
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Error saving coupon', err);
      },
    });
  }

  toggleStatus(coupon: any): void {
    this.adminService
      .updateCoupon(coupon.id, { active: !coupon.active })
      .subscribe({
        next: () => this.loadCoupons(),
        error: (err) => console.error('Error toggling coupon status', err),
      });
  }

  deleteCoupon(coupon: any): void {
    if (confirm(`¿Estás seguro que querés eliminar el cupón "${coupon.code}"? Esta acción no se puede deshacer.`)) {
      this.adminService.deleteCoupon(coupon.id).subscribe({
        next: () => this.loadCoupons(),
        error: (err) => console.error('Error deleting coupon', err),
      });
    }
  }
}
