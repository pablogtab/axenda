import { Component, Inject, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { AppointmentsService } from '@services/appointments.service';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { ServicesService, BusinessService } from '@services/services.service';
import { ClientsService, Client } from '@services/clients.service';
import { format } from 'date-fns';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, finalize } from 'rxjs';

export interface AppointmentFormData {
  professionalId?: string;
  startTime?: string;
  date?: string;
  branchId?: string;
}

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form.html',
  styleUrls: ['./appointment-form.css']
})
export class AppointmentFormComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  private fb = inject(FormBuilder);
  private appointmentsService = inject(AppointmentsService);
  private professionalsService = inject(ProfessionalsService);
  private servicesService = inject(ServicesService);
  private clientsService = inject(ClientsService);

  form!: FormGroup;
  professionals = signal<Professional[]>([]);
  services = signal<BusinessService[]>([]);
  clients = signal<Client[]>([]);
  filteredClients = signal<Client[]>([]);
  selectedClient = signal<Client | null>(null);
  
  isSubmitting = signal(false);
  isSearching = signal(false);
  selectedIndex = signal(-1); // Índice del cliente resaltado con teclado
  private searchSubject = new Subject<string>();

  constructor(
    public dialogRef: DialogRef<any>,
    @Inject(DIALOG_DATA) public data: AppointmentFormData
  ) {
    this.initForm();
    this.setupSearch();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(query => {
        this.selectedIndex.set(-1);
        // Quitamos la restricción de longitud para permitir traer "clientes recientes/primeros" al hacer foco vacío
        this.isSearching.set(true);
        return this.clientsService.search(query).pipe(
          finalize(() => this.isSearching.set(false))
        );
      })
    ).subscribe(results => {
      this.filteredClients.set(results);
    });
  }

  handleKeyDown(event: KeyboardEvent): void {
    const results = this.filteredClients();
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(i => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && this.selectedIndex() >= 0) {
      event.preventDefault();
      this.selectClient(results[this.selectedIndex()]);
    } else if (event.key === 'Escape') {
      this.filteredClients.set([]);
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
      notes: [''],
      internalNotes: ['']
    });

    // Reaccionar a cambios en profesional para filtrar servicios (opcional si el backend lo requiere)
    this.form.get('professionalId')?.valueChanges.subscribe(id => {
      this.filterServicesByProfessional(id);
    });
  }

  private loadInitialData(): void {
    this.professionalsService.findAll().subscribe(profs => {
      this.professionals.set(profs.filter(p => p.active));
      if (this.data.professionalId) {
        this.filterServicesByProfessional(this.data.professionalId);
      }
    });

    this.servicesService.findAll().subscribe(services => {
      this.services.set(services.filter(s => s.active));
    });

    // Ya no cargamos todos los clientes al inicio
    this.filteredClients.set([]);
  }

  filterClients(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchSubject.next(query);
  }

  onFocus(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    // Búsqueda instantánea al hacer foco, sin esperar el debounce
    this.isSearching.set(true);
    this.clientsService.search(query).subscribe({
      next: (results) => {
        this.filteredClients.set(results);
        this.isSearching.set(false);
      },
      error: () => this.isSearching.set(false)
    });
  }

  onBlur(): void {
    // Delay para permitir que el click en un resultado se procese antes de cerrar la lista
    setTimeout(() => {
      this.filteredClients.set([]);
    }, 200);
  }

  selectClient(client: Client): void {
    this.selectedClient.set(client);
    this.form.patchValue({ clientId: client.id });
    this.filteredClients.set([]);
  }

  clearClient(): void {
    this.selectedClient.set(null);
    this.form.patchValue({ clientId: '' });
    // Esperamos al siguiente tick para que el input deje de estar hidden y podamos hacer foco
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 0);
  }

  filterServicesByProfessional(profId: string): void {
    // Aquí podrías filtrar la lista de servicios si el profesional solo hace algunos.
    // Por ahora mostramos todos, pero es un buen punto de extensión.
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    const val = this.form.value;
    
    // Construir startTime ISO
    const [hours, mins] = val.time.split(':');
    const startDate = new Date(val.date);
    startDate.setHours(Number(hours), Number(mins), 0, 0);

    const payload = {
      clientId: val.clientId,
      serviceId: val.serviceId,
      professionalId: val.professionalId,
      branchId: val.branchId,
      startTime: startDate.toISOString(),
      notes: val.notes,
      internalNotes: val.internalNotes
    };

    this.appointmentsService.create(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(res);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Error al crear turno:', err);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
