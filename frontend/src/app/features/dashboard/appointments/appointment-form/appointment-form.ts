import { Component, Inject, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { AppointmentsService } from '@services/appointments.service';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { ServicesService, BusinessService } from '@services/services.service';
import { ClientsService } from '@services/clients.service';
import { format } from 'date-fns';
import { createLocalDate, toLocalDateStr, toLocalTimeStr } from '@core/utils/date-utils';

export interface AppointmentFormData {
  appointmentId?: string;
  professionalId?: string;
  startTime?: string;
  date?: string;
  branchId?: string;
}

import { SearchableSelectComponent } from '@shared/components/searchable-select/searchable-select';
import { SelectComponent, SelectConfig } from '@shared/components/select/select';
import { getClientSearchConfig, getProfessionalSearchConfig } from '@core/configs/search-configs';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableSelectComponent, SelectComponent],
  templateUrl: './appointment-form.html',
  styleUrls: ['./appointment-form.css']
})
export class AppointmentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appointmentsService = inject(AppointmentsService);
  private professionalsService = inject(ProfessionalsService);
  private servicesService = inject(ServicesService);
  private clientsService = inject(ClientsService);

  form!: FormGroup;
  professionals = signal<Professional[]>([]);
  services = signal<BusinessService[]>([]);
  
  isSubmitting = signal(false);
  isEditMode = signal(false);

  // Configuraciones de los buscadores
  clientConfig = getClientSearchConfig(this.clientsService);
  profConfig = getProfessionalSearchConfig(this.professionalsService);

  serviceConfig: SelectConfig<BusinessService> = {
    label: 'Servicio',
    placeholder: 'Seleccionar servicio...',
    displayFn: (s) => s.name,
    descriptionFn: (s) => `${s.duration} min - $${s.price}`,
    valueFn: (s) => s.id
  };

  constructor(
    public dialogRef: DialogRef<any>,
    @Inject(DIALOG_DATA) public data: AppointmentFormData
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
    if (this.data.appointmentId) {
      this.isEditMode.set(true);
      this.loadAppointment(this.data.appointmentId);
    }
  }

  private initForm(): void {
    const defaultDate = this.data.date || format(new Date(), 'yyyy-MM-dd');
    const defaultTime = this.data.startTime || '09:00';

    this.form = this.fb.group({
      clientId: ['', Validators.required],
      serviceId: ['', Validators.required],
      professionalId: [this.data.professionalId || '', Validators.required],
      branchId: [this.data.branchId || '', Validators.required],
      date: [defaultDate, Validators.required],
      time: [defaultTime, Validators.required],
      endTime: ['', Validators.required],
      notes: [''],
      internalNotes: ['']
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

    if (!serviceId || !startTime || !date) return;

    const service = this.services().find(s => s.id === serviceId);
    if (!service) return;

    const start = createLocalDate(date, startTime);
    const end = new Date(start.getTime() + service.duration * 60000);
    
    this.form.patchValue({
      endTime: toLocalTimeStr(end)
    }, { emitEvent: false });
  }

  private loadAppointment(id: string): void {
    this.appointmentsService.findOne(id).subscribe(appointment => {
      // Ajustamos la fecha y hora
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
        notes: appointment.notes,
        internalNotes: appointment.internalNotes
      });
    });
  }

  private loadInitialData(): void {
    this.professionalsService.findAll().subscribe(profs => {
      this.professionals.set(profs.filter(p => p.active));
    });

    this.servicesService.findAll().subscribe(services => {
      this.services.set(services.filter(s => s.active));
    });
  }

  filterServicesByProfessional(profId: string): void {
    // Implementación futura de filtrado de servicios por profesional
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
      notes: val.notes,
      internalNotes: val.internalNotes
    };

    const request = this.isEditMode()
      ? this.appointmentsService.update(this.data.appointmentId!, payload)
      : this.appointmentsService.create(payload);

    request.subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(res);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al guardar turno:', err);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
