import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AppointmentsService,
  Appointment,
  AppointmentStatus,
} from '@services/appointments.service';
import {
  ProfessionalsService,
  Professional,
} from '@services/professionals.service';
import { BranchesService, Branch } from '@services/branches.service';
import { SnackbarService } from '@services/snackbar.service';
import { SidebarService } from '@services/sidebar.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { ModalService } from '@services/modal.service';
import { AppointmentFormComponent } from '../../../appointments/appointment-form/appointment-form';
import { CancelAppointmentDialogComponent } from '@shared/components/cancel-appointment-dialog/cancel-appointment-dialog.component';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { IconComponent } from '@shared/components/icon/icon.component';

interface GroupedData {
  key: string;
  label: string;
  color?: string;
  appointments: Appointment[];
  totalRevenue: number;
}

@Component({
  selector: 'app-agenda-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div
      class="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6 h-full overflow-y-auto custom-scrollbar relative"
      (click)="closeDropdowns()"
    >
      <!-- Loader Overlay -->
      <div
        *ngIf="isLoading()"
        class="absolute inset-0 bg-bg-primary/40 backdrop-blur-xs flex items-center justify-center z-50 rounded-[2rem]"
      >
        <div
          class="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"
        ></div>
      </div>

      <!-- Page Header -->
      <header class="flex justify-between items-center">
        <div class="header-info">
          <h1 class="text-3xl font-black mb-1 text-gradient">
            Lista de Turnos
          </h1>
          <p class="text-xs text-text-muted font-bold">
            Visualiza, filtra y gestiona todo el historial de turnos de tu
            negocio.
          </p>
        </div>
      </header>

      <!-- Filter & Grouping Control Bar -->
      <div class="glass p-5 rounded-2xl border border-border space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <!-- Search Input (md:col-span-3) -->
          <div class="md:col-span-3 space-y-1.5">
            <label
              class="text-[10px] font-black text-text-dim uppercase tracking-wider"
              >Buscar cliente, profesional o servicio</label
            >
            <div class="relative">
              <app-icon
                name="search"
                class="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm"
              ></app-icon>
              <input
                type="text"
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
                placeholder="Escribe para buscar..."
                class="w-full bg-surface-subtle/50 border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-text-main placeholder-text-muted focus:border-primary/50 focus:bg-surface-subtle transition-all outline-none"
              />
            </div>
          </div>

          <!-- Date Range (md:col-span-3) -->
          <div class="md:col-span-3 space-y-1.5">
            <label
              class="text-[10px] font-black text-text-dim uppercase tracking-wider"
              >Período de Fecha</label
            >
            <div class="flex items-center gap-2">
              <input
                type="date"
                [ngModel]="localStartDate()"
                (ngModelChange)="localStartDate.set($event); onRangeChange()"
                class="flex-1 bg-surface-subtle/50 border border-border rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-primary/50 transition-all cursor-pointer"
              />
              <span class="text-text-muted text-xs font-bold">a</span>
              <input
                type="date"
                [ngModel]="localEndDate()"
                (ngModelChange)="localEndDate.set($event); onRangeChange()"
                class="flex-1 bg-surface-subtle/50 border border-border rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
          </div>

          <!-- Branch Select (md:col-span-2) -->
          <div class="md:col-span-2 space-y-1.5">
            <label
              class="text-[10px] font-black text-text-dim uppercase tracking-wider"
              >Sucursal</label
            >
            <select
              [ngModel]="selectedBranchId()"
              (ngModelChange)="onBranchChange($event)"
              class="w-full bg-surface-subtle/50 border border-border rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-primary/50 transition-all cursor-pointer appearance-none"
              style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 10px center; background-size: 16px;"
            >
              <option *ngFor="let branch of branches()" [value]="branch.id">
                {{ branch.name }}
              </option>
            </select>
          </div>

          <!-- Professional Select (md:col-span-2) -->
          <div class="md:col-span-2 space-y-1.5">
            <label
              class="text-[10px] font-black text-text-dim uppercase tracking-wider"
              >Profesional</label
            >
            <select
              [ngModel]="selectedProfessionalId()"
              (ngModelChange)="selectedProfessionalId.set($event)"
              class="w-full bg-surface-subtle/50 border border-border rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-primary/50 transition-all cursor-pointer appearance-none"
              style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 10px center; background-size: 16px;"
            >
              <option value="all">Todos</option>
              <option *ngFor="let prof of professionals()" [value]="prof.id">
                {{ prof.firstName }} {{ prof.lastName }}
              </option>
            </select>
          </div>

          <!-- Group By Select (md:col-span-2) -->
          <div class="md:col-span-2 space-y-1.5">
            <label
              class="text-[10px] font-black text-text-dim uppercase tracking-wider"
              >Agrupar por</label
            >
            <select
              [ngModel]="groupBy()"
              (ngModelChange)="groupBy.set($event)"
              class="w-full bg-surface-subtle/50 border border-border rounded-xl px-3 py-2 text-xs text-text-main outline-none focus:border-primary/50 transition-all cursor-pointer appearance-none"
              style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 10px center; background-size: 16px;"
            >
              <option value="none">Sin Agrupar</option>
              <option value="professional">Profesional</option>
              <option value="branch">Sede</option>
              <option value="date">Día</option>
              <option value="status">Estado</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Collapsible Groups Listing -->
      <div
        class="space-y-4"
        *ngIf="filteredAppointments().length > 0; else emptyState"
      >
        <div *ngFor="let group of groupedAppointments()" class="space-y-2">
          <!-- Accordion Header -->
          <div
            *ngIf="groupBy() !== 'none'"
            (click)="toggleGroup(group.key)"
            class="w-full glass hover:bg-surface-subtle/60 p-4 rounded-xl border border-border/60 flex justify-between items-center cursor-pointer transition-all active:scale-[0.99]"
          >
            <div class="flex items-center gap-3">
              <!-- Small Color Bullet if applicable -->
              <span
                *ngIf="group.color"
                class="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 shadow-inner"
                [style.background-color]="group.color"
              ></span>

              <span class="text-sm font-black text-text-main">{{
                group.label
              }}</span>

              <!-- Pill summary -->
              <span
                class="px-2.5 py-0.5 rounded-full bg-surface-subtle border border-border/40 text-[9px] font-bold text-text-muted"
              >
                {{ group.appointments.length }}
                {{ group.appointments.length === 1 ? 'turno' : 'turnos' }}
              </span>
            </div>

            <div class="flex items-center gap-4">
              <span
                class="text-xs font-bold text-text-muted"
                *ngIf="group.totalRevenue > 0"
              >
                Facturación:
                <span class="text-green-400 font-extrabold">{{
                  group.totalRevenue | currency: 'ARS' : '$' : '1.0-0'
                }}</span>
              </span>
              <app-icon
                name="expand_more"
                class="text-text-dim text-lg transition-transform duration-300"
                [class.rotate-180]="isGroupCollapsed(group.key)"
              ></app-icon>
            </div>
          </div>

          <!-- Accordion Content (Table or Cards) -->
          <div *ngIf="!isGroupCollapsed(group.key)" class="space-y-3">
            <!-- Desktop Table Layout -->
            <div
              class="hidden md:block card-glass !p-0 overflow-visible border-border"
            >
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr
                    class="border-b border-border bg-surface-subtle/50 text-[10px] uppercase font-black tracking-wider text-text-muted"
                  >
                    <th class="py-3.5 px-4 font-black rounded-tl-2xl">
                      Hora / Sede
                    </th>
                    <th class="py-3.5 px-4 font-black">Cliente</th>
                    <th class="py-3.5 px-4 font-black">Profesional</th>
                    <th class="py-3.5 px-4 font-black">Servicio</th>
                    <th class="py-3.5 px-4 font-black">Precio</th>
                    <th class="py-3.5 px-4 font-black">Estado</th>
                    <th
                      class="py-3.5 px-4 font-black text-right rounded-tr-2xl"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr
                    *ngFor="let app of group.appointments"
                    class="hover:bg-surface-subtle/30 text-xs text-text-main transition-colors"
                  >
                    <!-- Time & Branch -->
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-text-main text-sm">
                        {{ app.startTime | date: 'HH:mm' }} -
                        {{ app.endTime | date: 'HH:mm' }}
                      </div>
                      <div
                        class="text-[10px] text-text-dim font-bold flex items-center gap-1 mt-0.5"
                      >
                        <app-icon
                          name="pin_drop"
                          class="text-[10px]"
                        ></app-icon>
                        {{ app.branch.name }}
                      </div>
                    </td>

                    <!-- Client Details -->
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-text-main text-sm">
                        {{ app.client.firstName }} {{ app.client.lastName }}
                      </div>
                      <div
                        class="text-[10px] text-text-dim flex flex-col gap-0.5 mt-0.5 font-medium"
                      >
                        <span
                          *ngIf="app.client.phone"
                          class="flex items-center gap-1"
                        >
                          <app-icon
                            name="call"
                            class="text-[10px] text-text-dim"
                          ></app-icon>
                          {{ app.client.phone }}
                        </span>
                        <span
                          *ngIf="app.client.email"
                          class="flex items-center gap-1"
                        >
                          <app-icon
                            name="mail"
                            class="text-[10px] text-text-dim"
                          ></app-icon>
                          {{ app.client.email }}
                        </span>
                      </div>
                    </td>

                    <!-- Professional -->
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-2">
                        <span
                          class="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                          [style.background-color]="app.professional.color"
                        ></span>
                        <span class="font-bold"
                          >{{ app.professional.firstName }}
                          {{ app.professional.lastName }}</span
                        >
                      </div>
                    </td>

                    <!-- Service -->
                    <td class="py-3.5 px-4">
                      <div class="font-bold">{{ app.service.name }}</div>
                      <div class="text-[10px] text-text-dim font-bold mt-0.5">
                        {{ app.service.duration }} min
                      </div>
                    </td>

                    <!-- Price -->
                    <td class="py-3.5 px-4">
                      <div class="font-extrabold text-sm text-text-main">
                        {{
                          app.service.price | currency: 'ARS' : '$' : '1.0-0'
                        }}
                      </div>
                    </td>

                    <!-- Status Select Dropdown -->
                    <td class="py-3.5 px-4 relative">
                      <button
                        (click)="toggleDropdown($event, app.id)"
                        class="px-3 py-1.5 rounded-xl border border-border text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer hover:bg-surface-subtle transition-all active:scale-95"
                        [style.background-color]="
                          getStatusOption(app.status).bg
                        "
                        [style.color]="getStatusOption(app.status).color"
                        [style.border-color]="
                          getStatusOption(app.status).color + '20'
                        "
                      >
                        {{ getStatusOption(app.status).label }}
                        <app-icon
                          name="arrow_drop_down"
                          class="text-xs"
                        ></app-icon>
                      </button>

                      <!-- Dropdown Menu -->
                      <div
                        *ngIf="activeDropdownId() === app.id"
                        class="absolute top-12 left-4 z-40 bg-surface-subtle/95 backdrop-blur-md border border-border rounded-2xl shadow-xl py-2 w-48 text-left animate-in fade-in zoom-in-95 duration-100"
                        (click)="$event.stopPropagation()"
                      >
                        <button
                          *ngFor="let opt of statusOptions"
                          (click)="quickUpdateStatus(app.id, opt.value)"
                          class="w-full px-4 py-2 text-xs font-bold hover:bg-surface-subtle-hover flex items-center gap-2 transition-colors cursor-pointer"
                          [style.color]="opt.color"
                        >
                          <span
                            class="w-2.5 h-2.5 rounded-full"
                            [style.background-color]="opt.color"
                          ></span>
                          {{ opt.label }}
                        </button>
                      </div>
                    </td>

                    <!-- Actions -->
                    <td class="py-3.5 px-4 text-right">
                      <div class="flex justify-end gap-1.5">
                        <button
                          (click)="onEdit(app)"
                          class="btn-icon-small"
                          title="Editar turno"
                        >
                          <app-icon name="edit" class="text-sm"></app-icon>
                        </button>
                        <button
                          *ngIf="app.status !== 'CANCELLED'"
                          (click)="quickCancel(app.id)"
                          class="btn-icon-small btn-icon-delete"
                          title="Cancelar turno"
                        >
                          <app-icon name="cancel" class="text-sm"></app-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards Layout -->
            <div class="block md:hidden space-y-3">
              <div
                *ngFor="let app of group.appointments"
                class="glass p-4 rounded-2xl border border-border flex flex-col gap-3 relative overflow-visible"
              >
                <!-- Card Header -->
                <div class="flex justify-between items-start">
                  <div>
                    <span
                      class="text-[10px] font-black text-primary uppercase tracking-widest block"
                    >
                      {{ app.startTime | date: 'HH:mm' }} -
                      {{ app.endTime | date: 'HH:mm' }}
                    </span>
                    <h4 class="text-sm font-extrabold text-text-main mt-0.5">
                      {{ app.client.firstName }} {{ app.client.lastName }}
                    </h4>
                  </div>
                  <div class="relative">
                    <button
                      (click)="toggleDropdown($event, app.id)"
                      class="px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      [style.background-color]="getStatusOption(app.status).bg"
                      [style.color]="getStatusOption(app.status).color"
                      [style.border-color]="
                        getStatusOption(app.status).color + '20'
                      "
                    >
                      {{ getStatusOption(app.status).label }}
                      <app-icon
                        name="arrow_drop_down"
                        class="text-xs"
                      ></app-icon>
                    </button>

                    <!-- Dropdown Menu Mobile -->
                    <div
                      *ngIf="activeDropdownId() === app.id"
                      class="absolute right-0 top-8 z-40 bg-surface-subtle/95 backdrop-blur-md border border-border rounded-2xl shadow-xl py-1.5 w-40 text-left animate-in fade-in zoom-in-95 duration-100"
                      (click)="$event.stopPropagation()"
                    >
                      <button
                        *ngFor="let opt of statusOptions"
                        (click)="quickUpdateStatus(app.id, opt.value)"
                        class="w-full px-3 py-1.5 text-[10px] font-bold hover:bg-surface-subtle-hover flex items-center gap-2 transition-colors cursor-pointer"
                        [style.color]="opt.color"
                      >
                        <span
                          class="w-2 h-2 rounded-full"
                          [style.background-color]="opt.color"
                        ></span>
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Card Body Info -->
                <div
                  class="grid grid-cols-2 gap-2 border-t border-b border-border/40 py-2.5 text-[10px]"
                >
                  <div>
                    <span
                      class="text-text-dim block font-bold uppercase tracking-wider text-[8px]"
                      >Profesional</span
                    >
                    <span
                      class="font-bold text-text-main mt-0.5 flex items-center gap-1.5"
                    >
                      <span
                        class="w-2 h-2 rounded-full"
                        [style.background-color]="app.professional.color"
                      ></span>
                      {{ app.professional.firstName }}
                      {{ app.professional.lastName }}
                    </span>
                  </div>
                  <div>
                    <span
                      class="text-text-dim block font-bold uppercase tracking-wider text-[8px]"
                      >Servicio</span
                    >
                    <span
                      class="font-bold text-text-main mt-0.5 truncate block"
                    >
                      {{ app.service.name }} ({{ app.service.duration }}m)
                    </span>
                  </div>
                  <div class="mt-1.5">
                    <span
                      class="text-text-dim block font-bold uppercase tracking-wider text-[8px]"
                      >Sede / Sucursal</span
                    >
                    <span
                      class="font-bold text-text-main mt-0.5 flex items-center gap-1"
                    >
                      <app-icon name="pin_drop" class="text-[10px]"></app-icon>
                      {{ app.branch.name }}
                    </span>
                  </div>
                  <div class="mt-1.5">
                    <span
                      class="text-text-dim block font-bold uppercase tracking-wider text-[8px]"
                      >Precio / Facturado</span
                    >
                    <span class="font-extrabold text-green-400 mt-0.5 text-xs">
                      {{ app.service.price | currency: 'ARS' : '$' : '1.0-0' }}
                    </span>
                  </div>
                </div>

                <!-- Card Actions -->
                <div class="flex justify-between items-center mt-1">
                  <span
                    class="text-[9px] text-text-dim font-medium"
                    *ngIf="app.client.phone"
                  >
                    📞 {{ app.client.phone }}
                  </span>
                  <div class="flex gap-2 ml-auto">
                    <button
                      (click)="onEdit(app)"
                      class="btn-icon-small !w-7 !h-7"
                      title="Editar"
                    >
                      <app-icon name="edit" class="text-xs"></app-icon>
                    </button>
                    <button
                      *ngIf="app.status !== 'CANCELLED'"
                      (click)="quickCancel(app.id)"
                      class="btn-icon-small btn-icon-delete !w-7 !h-7"
                      title="Cancelar"
                    >
                      <app-icon name="cancel" class="text-xs"></app-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <ng-template #emptyState>
        <div
          class="card-glass py-16 flex flex-col items-center justify-center border-border/80"
        >
          <div
            class="w-16 h-16 rounded-full bg-surface-subtle border border-border flex items-center justify-center mb-4"
          >
            <app-icon
              name="calendar_today"
              class="text-text-dim text-2xl"
            ></app-icon>
          </div>
          <h3 class="text-lg font-black text-text-main">
            No hay turnos registrados
          </h3>
          <p class="text-xs text-text-dim max-w-xs text-center mt-1 font-bold">
            Prueba cambiando el rango de fechas, seleccionando otra sucursal o
            buscando un término diferente.
          </p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow-y: auto;
      }
    `,
  ],
})
export class AgendaListViewComponent implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private snackbarService = inject(SnackbarService);
  public sidebarService = inject(SidebarService);
  private branchesService = inject(BranchesService);
  private professionalsService = inject(ProfessionalsService);
  private userConfig = inject(UserConfigurationService);
  private modal = inject(ModalService);

  // State Signals
  date = signal<Date>(new Date());
  branches = signal<Branch[]>([]);
  professionals = signal<Professional[]>([]);
  selectedBranchId = signal<string | null>(null);
  selectedStatuses = signal<string[]>([]);

  // Local range and filters
  localStartDate = signal<string>('');
  localEndDate = signal<string>('');
  searchTerm = signal<string>('');
  selectedProfessionalId = signal<string>('all');
  selectedStatus = signal<string>('all');
  groupBy = signal<'none' | 'professional' | 'branch' | 'date' | 'status'>(
    'none',
  );
  collapsedGroups = signal<Set<string>>(new Set());
  rawAppointments = signal<Appointment[]>([]);
  isLoading = signal<boolean>(false);
  activeDropdownId = signal<string | null>(null);

  statusOptions = [
    {
      value: 'PENDING',
      label: 'Reservado',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.1)',
    },
    {
      value: 'CONFIRMED',
      label: 'Confirmado',
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.1)',
    },
    {
      value: 'WAITING',
      label: 'En Espera',
      color: '#2dd4bf',
      bg: 'rgba(45,212,191,0.1)',
    },
    {
      value: 'COMPLETED',
      label: 'Finalizado',
      color: '#c084fc',
      bg: 'rgba(192,132,252,0.1)',
    },
    {
      value: 'NO_SHOW',
      label: 'No asistió',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.1)',
    },
    {
      value: 'CANCELLED',
      label: 'Cancelado',
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.1)',
    },
  ];

  constructor() {
    // Sincronizar fechas cuando cambia el date
    effect(() => {
      const dateVal = this.date();
      if (dateVal) {
        const start = format(startOfMonth(dateVal), 'yyyy-MM-dd');
        const end = format(endOfMonth(dateVal), 'yyyy-MM-dd');
        this.localStartDate.set(start);
        this.localEndDate.set(end);
      }
    });

    // Cargar turnos automáticamente cuando cambian los filtros clave
    effect(() => {
      this.selectedBranchId();
      this.localStartDate();
      this.localEndDate();
      this.loadAppointments();
    });

    // Cargar profesionales al cambiar sucursal
    effect(() => {
      const branchId = this.selectedBranchId();
      if (branchId) {
        this.loadProfessionals(branchId);
      }
    });
  }

  ngOnInit(): void {
    // Cargar configuración persistida de estados
    this.selectedStatuses.set(this.userConfig.agendaSelectedStatuses());

    // Cargar sucursales
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoading.set(true);
    this.branchesService.findAll().subscribe({
      next: (data) => {
        const activeBranches = data.filter((b) => b.active);
        this.branches.set(activeBranches);

        if (activeBranches.length > 0) {
          const configBranchId = this.userConfig.agendaSelectedBranchId();
          const exists = activeBranches.some((b) => b.id === configBranchId);
          if (exists && configBranchId) {
            this.selectedBranchId.set(configBranchId);
          } else {
            this.selectedBranchId.set(activeBranches[0].id);
          }
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.error('Error al cargar las sucursales.');
      },
    });
  }

  loadProfessionals(branchId: string): void {
    this.isLoading.set(true);
    this.professionalsService.findAll(branchId).subscribe({
      next: (profs) => {
        const activeProfs = profs.filter((p) => p.active);
        this.professionals.set(activeProfs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.error('Error al cargar profesionales.');
      },
    });
  }

  onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
    this.userConfig.updateAgendaBranchId(branchId);
  }

  onRangeChange(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    if (
      !this.selectedBranchId() ||
      !this.localStartDate() ||
      !this.localEndDate()
    )
      return;

    this.isLoading.set(true);

    const startISO = new Date(
      this.localStartDate() + 'T00:00:00',
    ).toISOString();
    const endISO = new Date(this.localEndDate() + 'T23:59:59').toISOString();

    this.appointmentsService
      .findAll({
        startDate: startISO,
        endDate: endISO,
        branchId: this.selectedBranchId()!,
      })
      .subscribe({
        next: (data) => {
          this.rawAppointments.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.snackbarService.error('Error al cargar la lista de turnos.');
        },
      });
  }

  // Filtrado reactivo
  filteredAppointments = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const profId = this.selectedProfessionalId();
    const statusVal = this.selectedStatus();
    const parentStatuses = this.selectedStatuses();

    return this.rawAppointments().filter((app) => {
      // 1. Filtrar por estados configurados
      if (
        parentStatuses &&
        parentStatuses.length > 0 &&
        !parentStatuses.includes(app.status)
      ) {
        return false;
      }

      // 2. Filtro local de estado
      if (statusVal !== 'all' && app.status !== statusVal) {
        return false;
      }

      // 3. Filtro local de profesional
      if (profId !== 'all' && app.professional.id !== profId) {
        return false;
      }

      // 4. Filtro por término de búsqueda
      if (term) {
        const clientName =
          `${app.client.firstName} ${app.client.lastName}`.toLowerCase();
        const clientPhone = (app.client.phone || '').toLowerCase();
        const clientEmail = (app.client.email || '').toLowerCase();
        const profName =
          `${app.professional.firstName} ${app.professional.lastName}`.toLowerCase();
        const serviceName = app.service.name.toLowerCase();
        const notes = (app.notes || '').toLowerCase();

        return (
          clientName.includes(term) ||
          clientPhone.includes(term) ||
          clientEmail.includes(term) ||
          profName.includes(term) ||
          serviceName.includes(term) ||
          notes.includes(term)
        );
      }

      return true;
    });
  });

  // Agrupamiento dinámico
  groupedAppointments = computed((): GroupedData[] => {
    const apps = this.filteredAppointments();
    const mode = this.groupBy();

    if (mode === 'none') {
      return [
        {
          key: 'all',
          label: 'Turnos',
          appointments: apps,
          totalRevenue: this.calculateRevenue(apps),
        },
      ];
    }

    const groupsMap = new Map<string, Appointment[]>();

    apps.forEach((app) => {
      let key = '';
      let label = '';
      let color = '';

      if (mode === 'professional') {
        key = app.professional.id;
        label = `${app.professional.firstName} ${app.professional.lastName}`;
        color = app.professional.color;
      } else if (mode === 'branch') {
        key = app.branch.id;
        label = app.branch.name;
      } else if (mode === 'date') {
        const localDate = parseISO(app.startTime);
        key = format(localDate, 'yyyy-MM-dd');
        label = format(localDate, "EEEE, d 'de' MMMM", { locale: es });
      } else if (mode === 'status') {
        key = app.status;
        const option = this.statusOptions.find((o) => o.value === app.status);
        label = option ? option.label : app.status;
        color = option ? option.color : '';
      }

      const list = groupsMap.get(key) || [];
      list.push(app);
      groupsMap.set(key, list);
    });

    const groups: GroupedData[] = [];
    groupsMap.forEach((appointments, key) => {
      let label = key;
      let color = '';

      if (mode === 'professional') {
        const firstApp = appointments[0];
        label = `${firstApp.professional.firstName} ${firstApp.professional.lastName}`;
        color = firstApp.professional.color;
      } else if (mode === 'branch') {
        label = appointments[0].branch.name;
      } else if (mode === 'date') {
        const localDate = parseISO(appointments[0].startTime);
        label = format(localDate, "EEEE, d 'de' MMMM", { locale: es });
      } else if (mode === 'status') {
        const option = this.statusOptions.find((o) => o.value === key);
        label = option ? option.label : key;
        color = option ? option.color : '';
      }

      appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));

      groups.push({
        key,
        label,
        color,
        appointments,
        totalRevenue: this.calculateRevenue(appointments),
      });
    });

    if (mode === 'date') {
      groups.sort((a, b) => a.key.localeCompare(b.key));
    } else {
      groups.sort((a, b) => a.label.localeCompare(b.label));
    }

    return groups;
  });

  calculateRevenue(apps: Appointment[]): number {
    return apps
      .filter(
        (a) =>
          a.status === 'COMPLETED' ||
          a.status === 'CONFIRMED' ||
          a.status === 'WAITING',
      )
      .reduce((acc, a) => acc + Number(a.service.price || 0), 0);
  }

  toggleGroup(key: string): void {
    const current = new Set(this.collapsedGroups());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.collapsedGroups.set(current);
  }

  isGroupCollapsed(key: string): boolean {
    return this.collapsedGroups().has(key);
  }

  toggleDropdown(event: Event, appId: string): void {
    event.stopPropagation();
    if (this.activeDropdownId() === appId) {
      this.activeDropdownId.set(null);
    } else {
      this.activeDropdownId.set(appId);
    }
  }

  closeDropdowns(): void {
    this.activeDropdownId.set(null);
  }

  quickUpdateStatus(id: string, status: string): void {
    this.closeDropdowns();
    this.appointmentsService
      .updateStatus(id, status as AppointmentStatus)
      .subscribe({
        next: () => {
          this.snackbarService.success('Estado del turno actualizado.');
          this.loadAppointments();
        },
        error: () => {
          this.snackbarService.error('Error al actualizar el estado.');
        },
      });
  }

  quickCancel(id: string): void {
    this.closeDropdowns();
    const appointment = this.rawAppointments().find((a) => a.id === id);
    if (!appointment) return;

    const dialogRef = this.modal.open(CancelAppointmentDialogComponent, {
      data: {
        clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
        hasPhone: !!appointment.client.phone,
      },
      width: '400px',
    });

    dialogRef.closed.subscribe((result) => {
      if (result && result.confirm) {
        this.appointmentsService.cancel(id, result.notify).subscribe({
          next: () => {
            this.snackbarService.success('Turno cancelado.');
            this.loadAppointments();
          },
          error: () => {
            this.snackbarService.error('Error al cancelar el turno.');
          },
        });
      }
    });
  }

  onEdit(appointment: Appointment): void {
    this.closeDropdowns();
    const dialogRef = this.modal.open(AppointmentFormComponent, {
      data: {
        appointmentId: appointment.id,
        professionalId: appointment.professional?.id,
        branchId: appointment.branch?.id,
        date: format(new Date(appointment.startTime), 'yyyy-MM-dd'),
        startTime: format(new Date(appointment.startTime), 'HH:mm'),
        endTime: format(new Date(appointment.endTime), 'HH:mm'),
        clientId: appointment.client?.id,
        serviceId: appointment.service?.id,
        status: appointment.status,
        notes: appointment.notes,
      },
      width: '500px',
    });

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.loadAppointments();
      }
    });
  }

  getStatusOption(status: string) {
    return (
      this.statusOptions.find((o) => o.value === status) || {
        label: status,
        color: '#ffffff',
        bg: 'rgba(255,255,255,0.1)',
      }
    );
  }
}
