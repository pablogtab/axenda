import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { BookingInvitationsService } from '@services/booking-invitations.service';
import { SnackbarService } from '@services/snackbar.service';
import { TimeInputComponent } from '@shared/components/time-input/time-input';
import {
  SelectComponent,
  SelectConfig,
} from '@shared/components/select/select';
import { SearchableSelectComponent } from '@shared/components/searchable-select/searchable-select';
import { getClientSearchConfig } from '@core/configs/search-configs';
import { BranchesService, Branch } from '@services/branches.service';
import {
  ProfessionalsService,
  Professional,
} from '@services/professionals.service';
import { ClientsService, Client } from '@services/clients.service';

@Component({
  selector: 'app-booking-invitation-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TimeInputComponent,
    SelectComponent,
    SearchableSelectComponent,
  ],
  template: `
    <div
      class="card-glass w-[520px] max-w-full flex flex-col max-h-[90dvh] !p-0 overflow-hidden animate-in fade-in zoom-in duration-200"
    >
      <header
        class="flex justify-between items-center px-10 pt-10 pb-6 shrink-0"
      >
        <h2 class="text-3xl font-bold text-text-main">Nueva Invitación</h2>
        <button
          type="button"
          class="text-3xl leading-none text-text-dim hover:text-red-500 transition-colors"
          (click)="onCancel()"
        >
          ×
        </button>
      </header>

      <form
        (ngSubmit)="onSubmit()"
        class="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div
          class="flex-1 overflow-y-auto custom-scrollbar px-10 pb-6 flex flex-col gap-6"
        >
          <!-- 1. ¿Para quién? Sucursal, Profesional y Cliente (opcionales) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-select
              [options]="branches()"
              [config]="branchSelectConfig"
              [ngModel]="selectedBranchId()"
              (ngModelChange)="onBranchChange($event)"
              name="branchId"
            >
            </app-select>
            <app-select
              [options]="filteredProfessionals()"
              [config]="professionalSelectConfig"
              [ngModel]="selectedProfessionalId()"
              (ngModelChange)="selectedProfessionalId.set($event)"
              name="professionalId"
            >
            </app-select>
          </div>

          <!-- Cliente pre-asociado -->
          <div>
            <app-searchable-select
              [config]="clientSearchConfig"
              [ngModel]="selectedClientId()"
              (ngModelChange)="selectedClientId.set($event)"
              name="clientId"
            >
            </app-searchable-select>
          </div>

          <!-- 2. ¿En qué período? Fecha inicio / fin -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label
                for="startDate"
                class="text-sm font-semibold text-text-muted"
                >Fecha de Inicio *</label
              >
              <input
                id="startDate"
                type="date"
                [ngModel]="startDate()"
                (ngModelChange)="startDate.set($event)"
                name="startDate"
                class="input-field"
                required
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="endDate" class="text-sm font-semibold text-text-muted"
                >Fecha de Fin *</label
              >
              <input
                id="endDate"
                type="date"
                [ngModel]="endDate()"
                (ngModelChange)="endDate.set($event)"
                name="endDate"
                class="input-field"
                required
              />
            </div>
          </div>

          <!-- 3. ¿Qué días? -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-text-muted"
              >Días Permitidos</label
            >
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                *ngFor="let day of daysOfWeek"
                (click)="toggleDay(day.value)"
                [class.bg-primary]="isDaySelected(day.value)"
                [class.text-white]="isDaySelected(day.value)"
                [class.bg-surface-subtle]="!isDaySelected(day.value)"
                [class.text-text-muted]="!isDaySelected(day.value)"
                class="px-3.5 py-2 rounded-xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all select-none cursor-pointer"
              >
                {{ day.label }}
              </button>
            </div>
          </div>

          <!-- 4. ¿En qué horario? -->
          <div class="grid grid-cols-2 gap-4">
            <app-time-input
              [ngModel]="startTime()"
              (ngModelChange)="startTime.set($event)"
              name="startTime"
              label="Hora de Inicio *"
            >
            </app-time-input>
            <app-time-input
              [ngModel]="endTime()"
              (ngModelChange)="endTime.set($event)"
              name="endTime"
              label="Hora de Fin *"
            >
            </app-time-input>
          </div>

          <!-- 5. Límites del link -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label for="maxUses" class="text-sm font-semibold text-text-muted"
                >Límite de usos</label
              >
              <input
                id="maxUses"
                type="number"
                [ngModel]="maxUses()"
                (ngModelChange)="maxUses.set($event)"
                name="maxUses"
                placeholder="Sin límite"
                min="1"
                class="input-field"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label
                for="expiresAt"
                class="text-sm font-semibold text-text-muted"
                >Expira el (Enlace)</label
              >
              <input
                id="expiresAt"
                type="datetime-local"
                [ngModel]="expiresAt()"
                (ngModelChange)="expiresAt.set($event)"
                name="expiresAt"
                class="input-field"
              />
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <footer
          class="flex justify-end gap-4 px-10 py-6 border-t border-border bg-surface-subtle/30 shrink-0"
        >
          <button
            type="button"
            class="btn-secondary flex-1"
            (click)="onCancel()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn-primary flex-1"
            [disabled]="isSubmitting"
          >
            {{ isSubmitting ? 'Guardando...' : 'Crear Link' }}
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [
    `
      /* CSS scoped for booking invitation form */
      select {
        -webkit-appearance: none;
        appearance: none;
        background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
        background-position: right 0.5rem center;
        background-repeat: no-repeat;
        background-size: 1.25em 1.25em;
        padding-right: 2rem;
      }
    `,
  ],
})
export class BookingInvitationFormComponent implements OnInit {
  private invitationsService = inject(BookingInvitationsService);
  private snackbar = inject(SnackbarService);
  private dialogRef = inject(DialogRef);
  private branchesService = inject(BranchesService);
  private professionalsService = inject(ProfessionalsService);
  private clientsService = inject(ClientsService);
  private dialogData = inject<any>(DIALOG_DATA, { optional: true });

  isSubmitting = false;

  // Form Fields
  maxUses = signal<number | null>(1);
  expiresAt = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Single time range applied to all checked days
  startTime = signal('09:00');
  endTime = signal('18:00');

  // Selected day numbers (1 = Monday, 7 = Sunday)
  selectedDays = signal<number[]>([1, 2, 3, 4, 5]); // default Mon-Fri

  // Branch / Professional / Client filters
  branches = signal<Branch[]>([]);
  allProfessionals = signal<Professional[]>([]);
  selectedBranchId = signal<string | null>(null);
  selectedProfessionalId = signal<string | null>(null);
  selectedClientId = signal<string | null>(null);

  /** Profesionales filtrados por sucursal seleccionada */
  filteredProfessionals = computed(() => {
    const branchId = this.selectedBranchId();
    const profs = this.allProfessionals();
    if (!branchId) return profs;
    return profs.filter((p) =>
      p.branches?.some(
        (pb: any) => pb.branch?.id === branchId || pb.branchId === branchId,
      ),
    );
  });

  // SelectConfig objects for the shared component
  branchSelectConfig: SelectConfig<Branch> = {
    label: 'Sucursal',
    placeholder: 'Todas las sucursales',
    displayFn: (b) => b.name,
    valueFn: (b) => b.id,
  };

  professionalSelectConfig: SelectConfig<Professional> = {
    label: 'Profesional',
    placeholder: 'Cualquier profesional',
    displayFn: (p) => `${p.firstName} ${p.lastName}`,
    valueFn: (p) => p.id,
  };

  clientSearchConfig = getClientSearchConfig(this.clientsService);

  daysOfWeek = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' },
  ];

  constructor() {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    this.startDate.set(this.formatDate(today));
    this.endDate.set(this.formatDate(nextWeek));
  }

  ngOnInit(): void {
    this.branchesService.findAll().subscribe({
      next: (bs) => {
        const activeBranches = bs.filter((b) => b.active);
        this.branches.set(activeBranches);
        if (activeBranches.length === 1) {
          this.selectedBranchId.set(activeBranches[0].id);
        }
      },
      error: () => {},
    });
    this.professionalsService.findAll().subscribe({
      next: (ps) => {
        const activeProfs = ps.filter((p: Professional) => p.active);
        this.allProfessionals.set(activeProfs);
        // Pre-seleccionar profesional si solo hay uno en total
        if (activeProfs.length === 1) {
          this.selectedProfessionalId.set(activeProfs[0].id);
        }
      },
      error: () => {},
    });

    if (this.dialogData?.client) {
      this.selectedClientId.set(this.dialogData.client.id);
    } else if (this.dialogData?.clientId) {
      this.selectedClientId.set(this.dialogData.clientId);
    }
  }

  onBranchChange(branchId: string | null): void {
    this.selectedBranchId.set(branchId);
    // Reset professional if it's no longer in the filtered list
    const currentProfId = this.selectedProfessionalId();
    if (currentProfId) {
      const stillValid = this.filteredProfessionals().some(
        (p) => p.id === currentProfId,
      );
      if (!stillValid) this.selectedProfessionalId.set(null);
    }

    // Si después del cambio de sucursal solo queda un profesional filtrado, pre-seleccionarlo
    const filtered = this.filteredProfessionals();
    if (filtered.length === 1) {
      this.selectedProfessionalId.set(filtered[0].id);
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleDay(day: number): void {
    const current = this.selectedDays();
    if (current.includes(day)) {
      this.selectedDays.set(current.filter((d) => d !== day));
    } else {
      this.selectedDays.set([...current, day].sort());
    }
  }

  isDaySelected(day: number): boolean {
    return this.selectedDays().includes(day);
  }

  onSubmit(): void {
    if (this.selectedDays().length === 0) {
      this.snackbar.show('Debes seleccionar al menos un día.', 'warning');
      return;
    }

    if (this.startTime() >= this.endTime()) {
      this.snackbar.show(
        'La hora de inicio debe ser anterior a la hora de fin.',
        'warning',
      );
      return;
    }

    this.isSubmitting = true;

    // Build schedule from selected days and the time range
    const schedule = this.selectedDays().map((day) => ({
      dayOfWeek: day,
      startTime: this.startTime(),
      endTime: this.endTime(),
    }));

    const payload: any = {
      maxUses: this.maxUses() || undefined,
      expiresAt: this.expiresAt()
        ? new Date(this.expiresAt()).toISOString()
        : undefined,
      startDate: this.startDate()
        ? new Date(this.startDate() + 'T00:00:00Z').toISOString()
        : undefined,
      endDate: this.endDate()
        ? new Date(this.endDate() + 'T00:00:00Z').toISOString()
        : undefined,
      schedule,
    };

    if (this.selectedBranchId()) payload.branchId = this.selectedBranchId();
    if (this.selectedProfessionalId())
      payload.professionalId = this.selectedProfessionalId();
    if (this.selectedClientId()) payload.clientId = this.selectedClientId();

    this.invitationsService.create(payload).subscribe({
      next: (newInv) => {
        this.snackbar.success('Invitación creada exitosamente');
        this.dialogRef.close(newInv);
      },
      error: (err) => {
        console.error('Error creating invitation:', err);
        this.snackbar.error('Error al crear la invitación');
        this.isSubmitting = false;
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
