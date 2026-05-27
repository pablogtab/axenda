import { Component, Inject, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef, Dialog } from '@angular/cdk/dialog';
import { AppointmentsService, AppointmentStatus } from '@services/appointments.service';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { ServicesService, BusinessService } from '@services/services.service';
import { ClientsService } from '@services/clients.service';
import { TenantsService } from '@services/tenants.service';
import { format } from 'date-fns';
import { createLocalDate, toLocalDateStr, toLocalTimeStr } from '@core/utils/date-utils';
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

import { SearchableSelectComponent } from '@shared/components/searchable-select/searchable-select';
import { SelectComponent, SelectConfig } from '@shared/components/select/select';
import { TimeInputComponent } from '@shared/components/time-input/time-input';
import { getClientSearchConfig, getProfessionalSearchConfig } from '@core/configs/search-configs';
import { ClientFormComponent } from '../../clients/client-form/client-form.component';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableSelectComponent, SelectComponent, TimeInputComponent],
  templateUrl: './appointment-form.html',
  styleUrls: ['./appointment-form.css']
})
export class AppointmentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appointmentsService = inject(AppointmentsService);
  private professionalsService = inject(ProfessionalsService);
  private servicesService = inject(ServicesService);
  private clientsService = inject(ClientsService);
  private dialog = inject(Dialog);
  public tenantsService = inject(TenantsService);

  form!: FormGroup;
  professionals = signal<Professional[]>([]);
  allServices = signal<BusinessService[]>([]);
  services = signal<BusinessService[]>([]);
  
  isSubmitting = signal(false);
  isEditMode = signal(false);
  isLoadingData = signal(true);
  serverError = signal<string | null>(null);
  appointmentData = signal<any | null>(null);

  // Configuraciones de los buscadores
  clientConfig = { 
    ...getClientSearchConfig(this.clientsService), 
    addLabel: 'Nuevo Cliente' 
  };
  profConfig = getProfessionalSearchConfig(this.professionalsService);

  serviceConfig: SelectConfig<BusinessService> = {
    label: 'Servicio',
    placeholder: 'Seleccionar servicio...',
    displayFn: (s) => s.name,
    descriptionFn: (s) => `${s.duration} min - $${s.price}`,
    valueFn: (s) => s.id
  };
  
  statusConfig: SelectConfig<any> = {
    label: 'Estado del Turno',
    placeholder: 'Seleccionar estado...',
    displayFn: (s) => s.label,
    valueFn: (s) => s.value,
    colorFn: (s) => s.color
  };

  statusOptions = [
    { value: 'PENDING', label: 'Reservado', color: '#fbbf24' },
    { value: 'CONFIRMED', label: 'Confirmado', color: '#60a5fa' },
    { value: 'COMPLETED', label: 'Finalizado', color: '#c084fc' },
    { value: 'NO_SHOW', label: 'No asistió', color: '#f87171' },
    { value: 'CANCELLED', label: 'Cancelado', color: '#475569' }
  ];

  constructor(
    public dialogRef: DialogRef<any>,
    @Inject(DIALOG_DATA) public data: AppointmentFormData
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
    if (this.data.professionalId) patch.professionalId = this.data.professionalId;
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
      notifyClient: [true]
    });

    // Auto-calcular hora de fin al cambiar hora de inicio o servicio
    this.form.get('time')?.valueChanges.subscribe(() => this.updateEndTime());
    this.form.get('serviceId')?.valueChanges.subscribe(() => this.updateEndTime());

    this.form.get('professionalId')?.valueChanges.subscribe(id => {
      this.filterServicesByProfessional(id);
    });
  }

  private updateEndTime(): void {
    const serviceId = this.form.get('serviceId')?.value;
    const startTime = this.form.get('time')?.value;
    const date = this.form.get('date')?.value;

    if (!serviceId || !startTime || !date || startTime.length !== 5) return;

    const service = this.services().find(s => s.id === serviceId);
    if (!service) return;

    const start = createLocalDate(date, startTime);
    const end = new Date(start.getTime() + service.duration * 60000);
    
    this.form.patchValue({
      endTime: toLocalTimeStr(end)
    }, { emitEvent: false });
  }

  private loadAllData(): void {
    this.isLoadingData.set(true);

    const requests: any = {
      profs: this.professionalsService.findAll(this.data.branchId),
      services: this.servicesService.findAll()
    };

    if (this.data.appointmentId) {
      requests.appointment = this.appointmentsService.findOne(this.data.appointmentId);
    }

    forkJoin(requests).subscribe({
      next: (res: any) => {
        const { profs, services, appointment } = res;
        
        // 1. Profesionales
        this.professionals.set(profs.filter((p: Professional) => p.active));

        // 2. Servicios
        const activeServices = services.filter((s: BusinessService) => s.active);
        this.allServices.set(activeServices);

        // 3. Turno (si estamos editando)
        if (appointment) {
          this.appointmentData.set(appointment);
          const startDate = new Date(appointment.startTime);
          const endDate = new Date(appointment.endTime);

          this.form.patchValue({
            clientId: appointment.client?.id,
            serviceId: appointment.service?.id,
            professionalId: appointment.professional?.id,
            branchId: appointment.branch?.id,
            date: this.data.date || toLocalDateStr(startDate),
            time: toLocalTimeStr(startDate),
            endTime: toLocalTimeStr(endDate),
            status: appointment.status,
            notes: appointment.notes,
            internalNotes: appointment.internalNotes
          }, { emitEvent: false });
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
      }
    });
  }


  filterServicesByProfessional(profId: string): void {
    if (!profId) {
      this.services.set(this.allServices());
      return;
    }

    const prof = this.professionals().find(p => p.id === profId);
    
    if (!prof) {
      // Si el profesional no está en la lista inicial (ej: se cargó por búsqueda)
      // cargamos sus datos completos para tener sus servicios
      this.professionalsService.findOne(profId).subscribe(p => {
        // Actualizamos la lista local para futuras referencias
        this.professionals.update(profs => [...profs, p]);
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
      const allowedIds = prof.services.map(ps => ps.service.id);
      const filtered = this.allServices().filter(s => allowedIds.includes(s.id));
      this.services.set(filtered);
    }

    // Validar si el servicio actual sigue siendo válido
    const currentServiceId = this.form.get('serviceId')?.value;
    if (currentServiceId && !this.services().some(s => s.id === currentServiceId)) {
      this.form.patchValue({ serviceId: '' });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      console.warn('Formulario inválido:', this.form.value);
      // Log de errores por campo
      Object.keys(this.form.controls).forEach(key => {
        const controlErrors = this.form.get(key)?.errors;
        if (controlErrors) console.log(`Error en ${key}:`, controlErrors);
      });
      return;
    }

    this.isSubmitting.set(true);
    const val = this.form.value;
    
    const start = createLocalDate(val.date, val.time);
    const end = createLocalDate(val.date, val.endTime);

    const payload = {
      clientId: val.clientId,
      serviceId: val.serviceId,
      professionalId: val.professionalId,
      branchId: val.branchId,
      startTime: start.toISOString(),
      status: val.status,
      notes: val.notes,
      internalNotes: val.internalNotes,
      notifyClient: val.notifyClient
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
          this.serverError.set('Error inesperado: Verifica los datos e intenta nuevamente.');
        }
      }
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
      data: { firstName, lastName }
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result && result.id) {
        this.form.patchValue({ clientId: result.id });
      }
    });
  }
}
