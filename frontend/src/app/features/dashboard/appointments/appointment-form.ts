import {
  Component,
  Inject,
  OnInit,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DIALOG_DATA, DialogRef, Dialog } from '@angular/cdk/dialog';
import {
  AppointmentsService,
  AppointmentStatus,
} from '@services/appointments.service';
import {
  ProfessionalsService,
  Professional,
} from '@services/professionals.service';
import { ServicesService, BusinessService } from '@services/services.service';
import { ClientsService } from '@services/clients.service';
import {
  CustomFieldsService,
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldType,
} from '@services/custom-fields.service';
import { TenantsService } from '@services/tenants.service';
import { SnackbarService } from '@services/snackbar.service';
import { format } from 'date-fns';
import {
  createLocalDate,
  toLocalDateStr,
  toLocalTimeStr,
} from '@core/utils/date-utils';
import { forkJoin } from 'rxjs';

export interface AppointmentFormData {
  appointmentId?: string;
  professionalId?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  branchId?: string;
  // Para pre-carga optimista
  clientId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
  notes?: string;
  internalNotes?: string;
}

interface ClientCustomFieldSummaryItem {
  name: string;
  value: string;
}

import { SearchableSelectComponent } from '@shared/components/searchable-select';
import { SelectComponent, SelectConfig } from '@shared/components/select';
import { TimeInputComponent } from '@shared/components/time-input';
import {
  getClientSearchConfig,
  getProfessionalSearchConfig,
} from '@core/configs/search-configs';
import { ClientFormComponent } from '../clients/client-form.component';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SearchableSelectComponent,
    SelectComponent,
    TimeInputComponent,
  ],
  template: `
    <div
      class="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full flex flex-col animate-in fade-in zoom-in duration-200"
    >
      <!-- Header -->
      <header
        class="px-6 py-4 border-b border-border bg-surface-subtle flex justify-between items-center"
      >
        <div>
          <h2 class="text-xl font-bold text-text-main">
            {{ isEditMode() ? '📝 Editar Turno' : '📅 Agendar Nuevo Turno' }}
          </h2>
          <p class="text-xs text-text-dim mt-1">
            {{
              isEditMode()
                ? 'Modifica los detalles del turno seleccionado'
                : 'Completa los detalles para reservar la cita'
            }}
          </p>
        </div>
        <button
          (click)="close()"
          class="p-2 hover:bg-surface-subtle-hover rounded-xl transition-all text-text-dim hover:text-text-main"
        >
          ✕
        </button>
      </header>

      <div class="relative flex-1 overflow-hidden">
        <!-- Loading Overlay -->
        @if (isLoadingData()) {
          <div
            class="absolute inset-0 z-10 bg-surface/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300"
          >
            <div class="flex flex-col items-center gap-3">
              <div class="relative">
                <div
                  class="h-12 w-12 border-4 border-surface-subtle-hover rounded-full"
                ></div>
                <div
                  class="absolute top-0 left-0 h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
              <p
                class="text-xs font-bold text-text-main tracking-widest uppercase animate-pulse"
              >
                Cargando detalles...
              </p>
            </div>
          </div>
        }

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="px-6 py-4 space-y-4 overflow-y-auto max-h-[calc(100dvh-150px)] custom-scrollbar"
          [class.opacity-50]="isLoadingData()"
          [class.pointer-events-none]="isLoadingData()"
        >
          <!-- Sección: Cliente -->
          <app-searchable-select
            formControlName="clientId"
            [config]="clientConfig"
            (onAdd)="openNewClient($event)"
          ></app-searchable-select>

          @if (
            form.get('clientId')?.value &&
            clientCustomFieldsSummary().length > 0
          ) {
            <div class="client-custom-summary">
              <div class="client-custom-summary__header">
                <span class="client-custom-summary__title"
                  >Resumen del cliente</span
                >
                <span class="client-custom-summary__badge"
                  >Campos personalizados</span
                >
              </div>
              <div class="client-custom-summary__grid">
                @for (item of clientCustomFieldsSummary(); track item.name) {
                  <div class="client-custom-summary__item">
                    <span class="client-custom-summary__label">{{
                      item.name
                    }}</span>
                    <span class="client-custom-summary__value">{{
                      item.value
                    }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Sección: Servicio y Profesional (Aislados en filas diferentes) -->
          <app-select
            formControlName="serviceId"
            [options]="services()"
            [config]="serviceConfig"
          ></app-select>

          <app-searchable-select
            formControlName="professionalId"
            [config]="profConfig"
          ></app-searchable-select>

          <!-- Sección: Fecha y Hora -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="col-span-2 md:col-span-1 space-y-2">
              <label
                class="text-xs font-bold text-text-dim uppercase tracking-wider"
                >Fecha</label
              >
              <input
                type="date"
                formControlName="date"
                class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <!-- Horas en la misma fila -->
            <div class="col-span-2 md:col-span-2">
              <div class="flex gap-3">
                <div class="flex-1">
                  <app-time-input
                    formControlName="time"
                    label="Hora Inicio"
                  ></app-time-input>
                </div>
                <div class="flex-1">
                  <app-time-input
                    formControlName="endTime"
                    label="Hora Fin"
                  ></app-time-input>
                </div>
              </div>
            </div>
          </div>

          <!-- Sección: Estado (Solo en Edición) -->
          @if (isEditMode()) {
            <app-select
              formControlName="status"
              [options]="statusOptions"
              [config]="statusConfig"
            ></app-select>

            @if (
              form.get('status')?.value === 'CANCELLED' &&
              tenantsService.currentTenant()?.whatsappCancellation
            ) {
              <div
                class="flex items-center gap-3 p-3.5 rounded-xl bg-primary-glow border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    formControlName="notifyClient"
                    class="sr-only peer"
                  />
                  <div
                    class="w-9 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
                  ></div>
                </label>
                <div
                  class="flex flex-col gap-0.5 select-none cursor-pointer"
                  (click)="
                    form
                      .get('notifyClient')
                      ?.setValue(!form.get('notifyClient')?.value)
                  "
                >
                  <span class="text-xs font-bold text-text-main"
                    >Notificar al cliente por WhatsApp</span
                  >
                  <span class="text-[10px] text-text-dim leading-none"
                    >Envía la plantilla de cancelación automáticamente.</span
                  >
                </div>
              </div>
            }
          }

          <!-- Notas -->
          <div class="space-y-2">
            <label
              class="text-xs font-bold text-text-dim uppercase tracking-wider"
              >Notas del turno</label
            >
            <textarea
              formControlName="notes"
              rows="2"
              placeholder="Ej: El cliente llega 5 min tarde..."
              class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            ></textarea>
          </div>

          <!-- Campos Personalizados del Turno -->
          @if (isLoadingCustomFields()) {
            <div class="py-2 text-xs text-text-dim">
              Cargando campos personalizados del turno...
            </div>
          }

          @if (customFieldDefinitions().length > 0) {
            <div [formGroup]="customFieldsForm" class="space-y-3 pt-2">
              <div class="flex items-center gap-3">
                <div class="h-px flex-1 bg-border"></div>
                <h3
                  class="text-xs font-bold text-text-dim uppercase tracking-wider whitespace-nowrap"
                >
                  Campos del turno
                </h3>
                <div class="h-px flex-1 bg-border"></div>
              </div>

              @for (definition of customFieldDefinitions(); track definition.id) {
                <div class="space-y-2 py-1">
                  <label
                    class="text-xs font-bold text-text-dim uppercase tracking-wider"
                    [for]="customControlName(definition.id)"
                  >
                    {{ definition.name }}
                    @if (definition.required) {
                      <span class="text-error">*</span>
                    }
                  </label>

                  @if (isSelectField(definition)) {
                    <select
                      [id]="customControlName(definition.id)"
                      [formControlName]="customControlName(definition.id)"
                      class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    >
                      <option value="">Seleccionar opción...</option>
                      @for (
                        option of getSelectOptions(definition);
                        track option.id
                      ) {
                        <option [value]="option.id">{{ option.label }}</option>
                      }
                    </select>
                  } @else if (definition.type === 'BOOLEAN') {
                    <label
                      class="inline-flex items-center gap-2 text-sm text-text-main cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        [id]="customControlName(definition.id)"
                        [formControlName]="customControlName(definition.id)"
                        class="w-4 h-4 rounded border-border bg-surface-subtle text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      Sí
                    </label>
                  } @else {
                    <input
                      [id]="customControlName(definition.id)"
                      [type]="getInputType(definition.type)"
                      [formControlName]="customControlName(definition.id)"
                      class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      [placeholder]="
                        definition.type === 'DATE' ? '' : 'Ingresa un valor'
                      "
                    />
                  }

                  @if (
                    customFieldsForm.get(customControlName(definition.id))
                      ?.touched &&
                    customFieldsForm.get(customControlName(definition.id))
                      ?.invalid
                  ) {
                    <span class="text-[10px] text-error font-medium block ml-1"
                      >Campo obligatorio</span
                    >
                  }
                </div>
              }
            </div>
          }

          <!-- Server Error Message -->
          @if (serverError()) {
            <div
              class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <span class="text-red-500 text-lg">⚠️</span>
              <div class="flex-1">
                <p
                  class="text-xs font-bold text-red-500 uppercase tracking-wider"
                >
                  Error al agendar
                </p>
                <p class="text-[11px] text-red-400 leading-tight mt-0.5">
                  {{ serverError() }}
                </p>
              </div>
            </div>
          }
        </form>
      </div>

      <!-- Footer -->
      <footer
        class="px-6 py-4 border-t border-border bg-surface-subtle flex justify-end items-center gap-3"
      >
        @if (isEditMode() && appointmentData()) {
          <button
            type="button"
            (click)="openCancelPage()"
            class="mr-auto px-4 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 border border-primary/20 transition-all flex items-center gap-1"
          >
            🔗 Ver Sitio Cliente
          </button>
        }
        <button
          type="button"
          (click)="close()"
          class="px-6 py-2 rounded-xl text-sm font-bold text-text-dim hover:bg-surface-subtle transition-all"
        >
          Cancelar
        </button>
        <button
          (click)="onSubmit()"
          [disabled]="isSubmitting()"
          class="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          @if (isSubmitting()) {
            <div class="flex items-center gap-2">
              <div
                class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              ></div>
              <span>Agendando...</span>
            </div>
          } @else {
            <span>{{
              isEditMode() ? 'Actualizar Turno' : 'Confirmar Turno'
            }}</span>
          }
        </button>
      </footer>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }

      /* Glassmorphism effect for the whole modal */
      .bg-bg-primary {
        background-color: rgba(18, 18, 18, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
      }

      /* Animations */
      @keyframes zoomIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .animate-in {
        animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }

      select {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 1rem center;
        background-repeat: no-repeat;
        background-size: 1.5em 1.5em;
        padding-right: 2.5rem;
      }

      option {
        background-color: #1a1a1a;
        color: white;
      }

      .client-custom-summary {
        border: 1px solid var(--color-border);
        background: var(--color-surface-subtle);
        border-radius: 0.9rem;
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .client-custom-summary__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }

      .client-custom-summary__title {
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-text-dim);
      }

      .client-custom-summary__badge {
        font-size: 0.66rem;
        font-weight: 700;
        color: var(--color-primary);
        border: 1px solid
          color-mix(in srgb, var(--color-primary) 28%, transparent);
        background: color-mix(in srgb, var(--color-primary) 10%, transparent);
        border-radius: 999px;
        padding: 0.15rem 0.5rem;
      }

      .client-custom-summary__empty {
        margin: 0;
        font-size: 0.76rem;
        color: var(--color-text-dim);
      }

      .client-custom-summary__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
      }

      .client-custom-summary__item {
        border: 1px solid var(--color-border);
        border-radius: 0.65rem;
        padding: 0.45rem 0.55rem;
        background: color-mix(
          in srgb,
          var(--color-bg-primary) 30%,
          transparent
        );
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .client-custom-summary__label {
        font-size: 0.66rem;
        color: var(--color-text-dim);
      }

      .client-custom-summary__value {
        font-size: 0.78rem;
        color: var(--color-text-main);
        font-weight: 600;
        line-height: 1.2;
        word-break: break-word;
      }

      @media (max-width: 640px) {
        .client-custom-summary__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AppointmentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appointmentsService = inject(AppointmentsService);
  private professionalsService = inject(ProfessionalsService);
  private servicesService = inject(ServicesService);
  private clientsService = inject(ClientsService);
  private customFieldsService = inject(CustomFieldsService);
  private dialog = inject(Dialog);
  public tenantsService = inject(TenantsService);
  private snackbar = inject(SnackbarService);

  isLoadingCustomFields = signal(false);
  customFieldDefinitions = signal<CustomFieldDefinition[]>([]);
  customFieldsForm = this.fb.group({});

  form!: FormGroup;
  professionals = signal<Professional[]>([]);
  allServices = signal<BusinessService[]>([]);
  services = signal<BusinessService[]>([]);

  isSubmitting = signal(false);
  isEditMode = signal(false);
  isLoadingData = signal(true);
  isLoadingClientSummary = signal(false);
  serverError = signal<string | null>(null);
  appointmentData = signal<any | null>(null);
  clientCustomFieldsSummary = signal<ClientCustomFieldSummaryItem[]>([]);

  // Configuraciones de los buscadores
  clientConfig = {
    ...getClientSearchConfig(this.clientsService),
    addLabel: 'Nuevo Cliente',
  };
  profConfig = getProfessionalSearchConfig(this.professionalsService);

  serviceConfig: SelectConfig<BusinessService> = {
    label: 'Servicio',
    placeholder: 'Seleccionar servicio...',
    displayFn: (s) => s.name,
    descriptionFn: (s) => `${s.duration} min - $${s.price}`,
    valueFn: (s) => s.id,
  };

  statusConfig: SelectConfig<any> = {
    label: 'Estado del Turno',
    placeholder: 'Seleccionar estado...',
    displayFn: (s) => s.label,
    valueFn: (s) => s.value,
    colorFn: (s) => s.color,
  };

  statusOptions = [
    { value: 'PENDING', label: 'Reservado', color: '#fbbf24' },
    { value: 'CONFIRMED', label: 'Confirmado', color: '#60a5fa' },
    { value: 'COMPLETED', label: 'Finalizado', color: '#c084fc' },
    { value: 'NO_SHOW', label: 'No asistió', color: '#f87171' },
    { value: 'CANCELLED', label: 'Cancelado', color: '#475569' },
  ];

  constructor(
    public dialogRef: DialogRef<any>,
    @Inject(DIALOG_DATA) public data: AppointmentFormData,
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    if (this.data.appointmentId) {
      this.isEditMode.set(true);
    }

    // Aplicar pre-carga de datos recibidos inmediatamente
    this.patchFormWithInitialData();

    this.loadAllData();
  }

  private patchFormWithInitialData(): void {
    const patch: any = {};
    if (this.data.clientId) patch.clientId = this.data.clientId;
    if (this.data.serviceId) patch.serviceId = this.data.serviceId;
    if (this.data.professionalId)
      patch.professionalId = this.data.professionalId;
    if (this.data.branchId) patch.branchId = this.data.branchId;
    if (this.data.date) patch.date = this.data.date;
    if (this.data.startTime) patch.time = this.data.startTime;
    if (this.data.endTime) patch.endTime = this.data.endTime;
    if (this.data.status) patch.status = this.data.status;
    if (this.data.notes) patch.notes = this.data.notes;
    if (this.data.internalNotes) patch.internalNotes = this.data.internalNotes;

    if (Object.keys(patch).length > 0) {
      this.form.patchValue(patch, { emitEvent: false });
    }
  }

  private initForm(): void {
    const defaultDate = this.data.date || format(new Date(), 'yyyy-MM-dd');
    const defaultTime = this.data.startTime || '09:00';
    const defaultEndTime = this.data.endTime || '';

    this.form = this.fb.group({
      clientId: ['', Validators.required],
      serviceId: ['', Validators.required],
      professionalId: [this.data.professionalId || '', Validators.required],
      branchId: [this.data.branchId || '', Validators.required],
      date: [defaultDate, Validators.required],
      time: [defaultTime, Validators.required],
      endTime: [defaultEndTime, Validators.required],
      status: [AppointmentStatus.PENDING],
      notes: [''],
      internalNotes: [''],
      notifyClient: [false],
    });

    // Auto-calcular hora de fin al cambiar hora de inicio o servicio
    this.form.get('time')?.valueChanges.subscribe(() => this.updateEndTime());
    this.form
      .get('serviceId')
      ?.valueChanges.subscribe(() => this.updateEndTime());

    this.form.get('professionalId')?.valueChanges.subscribe((id) => {
      this.filterServicesByProfessional(id);
    });

    this.form.get('clientId')?.valueChanges.subscribe((clientId) => {
      this.loadClientCustomFieldsSummary(clientId);
    });
  }

  private updateEndTime(): void {
    const serviceId = this.form.get('serviceId')?.value;
    const startTime = this.form.get('time')?.value;
    const date = this.form.get('date')?.value;

    if (!serviceId || !startTime || !date || startTime.length !== 5) return;

    const service = this.services().find((s) => s.id === serviceId);
    if (!service) return;

    const start = createLocalDate(date, startTime);
    const end = new Date(start.getTime() + service.duration * 60000);

    this.form.patchValue(
      {
        endTime: toLocalTimeStr(end),
      },
      { emitEvent: false },
    );
  }

  private loadAllData(): void {
    this.isLoadingData.set(true);

    const requests: any = {
      profs: this.professionalsService.findAll(this.data.branchId),
      services: this.servicesService.findAll(),
    };

    if (this.data.appointmentId) {
      requests.appointment = this.appointmentsService.findOne(
        this.data.appointmentId,
      );
    }

    forkJoin(requests).subscribe({
      next: (res: any) => {
        const { profs, services, appointment } = res;

        // 1. Profesionales
        this.professionals.set(profs.filter((p: Professional) => p.active));

        // 2. Servicios
        const activeServices = services.filter(
          (s: BusinessService) => s.active,
        );
        this.allServices.set(activeServices);

        // 3. Turno (si estamos editando)
        if (appointment) {
          this.appointmentData.set(appointment);
          const startDate = new Date(appointment.startTime);
          const endDate = new Date(appointment.endTime);

          this.form.patchValue(
            {
              clientId: appointment.client?.id,
              serviceId: appointment.service?.id,
              professionalId: appointment.professional?.id,
              branchId: appointment.branch?.id,
              date: this.data.date || toLocalDateStr(startDate),
              time: toLocalTimeStr(startDate),
              endTime: toLocalTimeStr(endDate),
              status: appointment.status,
              notes: appointment.notes,
              internalNotes: appointment.internalNotes,
            },
            { emitEvent: false },
          );

          this.loadClientCustomFieldsSummary(appointment.client?.id);
          this.loadAppointmentCustomFields(appointment);
        } else {
          if (this.data.clientId) {
            this.loadClientCustomFieldsSummary(this.data.clientId);
          }
          this.loadAppointmentCustomFields();
        }

        // 4. Filtrar servicios por profesional inicial
        const currentProfId = this.form.get('professionalId')?.value;
        if (currentProfId) {
          this.filterServicesByProfessional(currentProfId);
        } else {
          this.services.set(activeServices);
        }

        this.isLoadingData.set(false);
      },
      error: (err) => {
        console.error('Error cargando datos del turno:', err);
        this.isLoadingData.set(false);
      },
    });
  }

  filterServicesByProfessional(profId: string): void {
    if (!profId) {
      this.services.set(this.allServices());
      return;
    }

    const prof = this.professionals().find((p) => p.id === profId);

    if (!prof) {
      // Si el profesional no está en la lista inicial (ej: se cargó por búsqueda)
      // cargamos sus datos completos para tener sus servicios
      this.professionalsService.findOne(profId).subscribe((p) => {
        // Actualizamos la lista local para futuras referencias
        this.professionals.update((profs) => [...profs, p]);
        this.applyServiceFilter(p);
      });
    } else {
      this.applyServiceFilter(prof);
    }
  }

  private applyServiceFilter(prof: Professional): void {
    if (!prof.services || prof.services.length === 0) {
      this.services.set([]);
    } else {
      const allowedIds = prof.services.map((ps) => ps.service.id);
      const filtered = this.allServices().filter((s) =>
        allowedIds.includes(s.id),
      );
      this.services.set(filtered);
    }

    // Validar si el servicio actual sigue siendo válido
    const currentServiceId = this.form.get('serviceId')?.value;
    if (
      currentServiceId &&
      !this.services().some((s) => s.id === currentServiceId)
    ) {
      this.form.patchValue({ serviceId: '' });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.customFieldsForm.invalid) {
      console.warn('Formulario inválido:', this.form.value);
      this.form.markAllAsTouched();
      this.customFieldsForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const val = this.form.value;

    const start = createLocalDate(val.date, val.time);
    const end = createLocalDate(val.date, val.endTime);

    const customFieldsPayload = this.buildCustomFieldPayload();

    const payload = {
      clientId: val.clientId,
      serviceId: val.serviceId,
      professionalId: val.professionalId,
      branchId: val.branchId,
      startTime: start.toISOString(),
      status: val.status,
      notes: val.notes,
      internalNotes: val.internalNotes,
      notifyClient: val.notifyClient,
      customFields: customFieldsPayload,
    };

    const request = this.isEditMode()
      ? this.appointmentsService.update(this.data.appointmentId!, payload)
      : this.appointmentsService.create(payload);

    request.subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.serverError.set(null);
        this.dialogRef.close(res);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al guardar turno:', err);

        // Extraer mensaje de error del backend
        const message = err.error?.message;
        if (Array.isArray(message)) {
          this.serverError.set(message[0]);
        } else if (typeof message === 'string') {
          this.serverError.set(message);
        } else {
          this.serverError.set(
            'Error inesperado: Verifica los datos e intenta nuevamente.',
          );
        }
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  openCancelPage(): void {
    const appt = this.appointmentData();
    if (appt) {
      const tokenOrId = appt.cancelToken || appt.id;
      window.open(`/booking/cancel/${tokenOrId}`, '_blank');
    }
  }

  openNewClient(query: string): void {
    const parts = query.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    const dialogRef = this.dialog.open(ClientFormComponent, {
      data: { firstName, lastName },
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result && result.id) {
        this.form.patchValue({ clientId: result.id });
      }
    });
  }

  private loadClientCustomFieldsSummary(clientId?: string): void {
    if (!clientId) {
      this.clientCustomFieldsSummary.set([]);
      this.isLoadingClientSummary.set(false);
      return;
    }

    this.isLoadingClientSummary.set(true);
    this.customFieldsService.getClientValues(clientId).subscribe({
      next: ({ definitions, values }) => {
        const valuesMap = new Map<string, CustomFieldValue>(
          values.map((v) => [v.fieldId, v]),
        );

        const summary = definitions
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((def) => {
            const rawValue = valuesMap.get(def.id)?.value;
            const formatted = this.formatCustomFieldValue(def, rawValue);
            return {
              name: def.name,
              value: formatted,
            };
          })
          .filter(
            (item) => item.value !== null,
          ) as ClientCustomFieldSummaryItem[];

        this.clientCustomFieldsSummary.set(summary);
        this.isLoadingClientSummary.set(false);
      },
      error: () => {
        this.clientCustomFieldsSummary.set([]);
        this.isLoadingClientSummary.set(false);
      },
    });
  }

  private formatCustomFieldValue(
    definition: CustomFieldDefinition,
    rawValue?: string | null,
  ): string | null {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }

    switch (definition.type) {
      case 'BOOLEAN': {
        const normalized = rawValue.toString().trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return 'Si';
        if (normalized === 'false' || normalized === '0') return 'No';
        return rawValue;
      }
      case 'DATE': {
        const date = new Date(rawValue);
        if (isNaN(date.getTime())) return rawValue;
        return format(date, 'dd/MM/yyyy');
      }
      case 'SELECT': {
        const option = definition.list?.options?.find((o) => o.id === rawValue);
        return option?.label ?? rawValue;
      }
      default:
        return rawValue;
    }
  }

  customControlName(fieldId: string): string {
    return `field_${fieldId}`;
  }

  isSelectField(definition: CustomFieldDefinition): boolean {
    return definition.type === 'SELECT';
  }

  getSelectOptions(definition: CustomFieldDefinition): any[] {
    return definition.list?.options ?? [];
  }

  getInputType(type: CustomFieldType): string {
    if (type === 'DATE') return 'date';
    if (type === 'NUMBER') return 'number';
    return 'text';
  }

  private loadAppointmentCustomFields(appointment?: any): void {
    this.isLoadingCustomFields.set(true);
    this.customFieldsService.getDefinitions('APPOINTMENT').subscribe({
      next: (definitions) => {
        this.customFieldDefinitions.set(definitions);

        const existingMap = new Map<string, string>(
          (appointment?.fieldValues || []).map((item: any) => [item.fieldId, item.value ?? '']),
        );

        for (const definition of definitions) {
          const controlName = this.customControlName(definition.id);
          const initialValue = appointment
            ? existingMap.get(definition.id)
            : (definition.defaultValue ?? '');
          const normalizedValue = this.parseIncomingValue(
            definition.type,
            initialValue,
          );
          const validators =
            definition.required && definition.type !== 'BOOLEAN'
              ? [Validators.required]
              : [];
          this.customFieldsForm.addControl(
            controlName,
            new FormControl(normalizedValue, validators),
          );
        }

        this.isLoadingCustomFields.set(false);
      },
      error: () => {
        this.isLoadingCustomFields.set(false);
        this.snackbar.error('No se pudieron cargar los campos personalizados del turno');
      },
    });
  }

  private buildCustomFieldPayload(): Array<{
    fieldId: string;
    value?: string;
  }> {
    const payload: Array<{ fieldId: string; value?: string }> = [];

    for (const definition of this.customFieldDefinitions()) {
      const controlName = this.customControlName(definition.id);
      const rawValue = this.customFieldsForm.get(controlName)?.value;
      const normalized = this.normalizeOutgoingValue(definition.type, rawValue);
      payload.push({ fieldId: definition.id, value: normalized });
    }

    return payload;
  }

  private parseIncomingValue(
    type: CustomFieldType,
    rawValue?: string | null,
  ): unknown {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return type === 'BOOLEAN' ? false : '';
    }

    if (type === 'BOOLEAN') {
      return rawValue === 'true';
    }

    if (type === 'NUMBER') {
      return Number(rawValue);
    }

    return rawValue;
  }

  private normalizeOutgoingValue(
    type: CustomFieldType,
    rawValue: unknown,
  ): string | undefined {
    if (type === 'BOOLEAN') {
      return rawValue ? 'true' : 'false';
    }

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return undefined;
    }

    return String(rawValue);
  }
}
