import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentsService, Appointment, AppointmentStatus } from '@services/appointments.service';
import { ProfessionalsService, Professional } from '@services/professionals.service';
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
  templateUrl: './agenda-list-view.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
    }
  `]
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
  groupBy = signal<'none' | 'professional' | 'branch' | 'date' | 'status'>('none');
  collapsedGroups = signal<Set<string>>(new Set());
  rawAppointments = signal<Appointment[]>([]);
  isLoading = signal<boolean>(false);
  activeDropdownId = signal<string | null>(null);

  statusOptions = [
    { value: 'PENDING', label: 'Reservado', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    { value: 'CONFIRMED', label: 'Confirmado', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { value: 'WAITING', label: 'En Espera', color: '#2dd4bf', bg: 'rgba(45,212,191,0.1)' },
    { value: 'IN_PROGRESS', label: 'En Curso', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { value: 'COMPLETED', label: 'Finalizado', color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
    { value: 'NO_SHOW', label: 'No asistió', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    { value: 'CANCELLED', label: 'Cancelado', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
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
        const activeBranches = data.filter(b => b.active);
        this.branches.set(activeBranches);

        if (activeBranches.length > 0) {
          const configBranchId = this.userConfig.agendaSelectedBranchId();
          const exists = activeBranches.some(b => b.id === configBranchId);
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
      }
    });
  }

  loadProfessionals(branchId: string): void {
    this.isLoading.set(true);
    this.professionalsService.findAll(branchId).subscribe({
      next: (profs) => {
        const activeProfs = profs.filter(p => p.active);
        this.professionals.set(activeProfs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.error('Error al cargar profesionales.');
      }
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
    if (!this.selectedBranchId() || !this.localStartDate() || !this.localEndDate()) return;

    this.isLoading.set(true);

    const startISO = new Date(this.localStartDate() + 'T00:00:00').toISOString();
    const endISO = new Date(this.localEndDate() + 'T23:59:59').toISOString();

    this.appointmentsService.findAll({
      startDate: startISO,
      endDate: endISO,
      branchId: this.selectedBranchId()!
    }).subscribe({
      next: (data) => {
        this.rawAppointments.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackbarService.error('Error al cargar la lista de turnos.');
      }
    });
  }

  // Filtrado reactivo
  filteredAppointments = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const profId = this.selectedProfessionalId();
    const statusVal = this.selectedStatus();
    const parentStatuses = this.selectedStatuses();

    return this.rawAppointments().filter(app => {
      // 1. Filtrar por estados configurados
      if (parentStatuses && parentStatuses.length > 0 && !parentStatuses.includes(app.status)) {
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
        const clientName = `${app.client.firstName} ${app.client.lastName}`.toLowerCase();
        const clientPhone = (app.client.phone || '').toLowerCase();
        const clientEmail = (app.client.email || '').toLowerCase();
        const profName = `${app.professional.firstName} ${app.professional.lastName}`.toLowerCase();
        const serviceName = app.service.name.toLowerCase();
        const notes = (app.notes || '').toLowerCase();

        return clientName.includes(term) ||
               clientPhone.includes(term) ||
               clientEmail.includes(term) ||
               profName.includes(term) ||
               serviceName.includes(term) ||
               notes.includes(term);
      }

      return true;
    });
  });

  // Agrupamiento dinámico
  groupedAppointments = computed((): GroupedData[] => {
    const apps = this.filteredAppointments();
    const mode = this.groupBy();

    if (mode === 'none') {
      return [{
        key: 'all',
        label: 'Turnos',
        appointments: apps,
        totalRevenue: this.calculateRevenue(apps)
      }];
    }

    const groupsMap = new Map<string, Appointment[]>();

    apps.forEach(app => {
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
        const option = this.statusOptions.find(o => o.value === app.status);
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
        const option = this.statusOptions.find(o => o.value === key);
        label = option ? option.label : key;
        color = option ? option.color : '';
      }

      appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));

      groups.push({
        key,
        label,
        color,
        appointments,
        totalRevenue: this.calculateRevenue(appointments)
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
      .filter(a => a.status === 'COMPLETED' || a.status === 'CONFIRMED' || a.status === 'WAITING' || a.status === 'IN_PROGRESS')
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
    this.appointmentsService.updateStatus(id, status as AppointmentStatus).subscribe({
      next: () => {
        this.snackbarService.success('Estado del turno actualizado.');
        this.loadAppointments();
      },
      error: () => {
        this.snackbarService.error('Error al actualizar el estado.');
      }
    });
  }

  quickCancel(id: string): void {
    this.closeDropdowns();
    const appointment = this.rawAppointments().find(a => a.id === id);
    if (!appointment) return;

    const dialogRef = this.modal.open(CancelAppointmentDialogComponent, {
      data: {
        clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
        hasPhone: !!appointment.client.phone
      },
      width: '400px'
    });

    dialogRef.closed.subscribe(result => {
      if (result && result.confirm) {
        this.appointmentsService.cancel(id, result.notify).subscribe({
          next: () => {
            this.snackbarService.success('Turno cancelado.');
            this.loadAppointments();
          },
          error: () => {
            this.snackbarService.error('Error al cancelar el turno.');
          }
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
        notes: appointment.notes
      },
      width: '500px'
    });

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.loadAppointments();
      }
    });
  }

  getStatusOption(status: string) {
    return this.statusOptions.find(o => o.value === status) || { label: status, color: '#ffffff', bg: 'rgba(255,255,255,0.1)' };
  }
}
