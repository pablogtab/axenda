import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  ProfessionalsService,
  Professional,
  Availability,
  AvailabilityException,
} from '@services/professionals.service';
import { SnackbarService } from '@services/snackbar.service';
import {
  SelectComponent,
  SelectConfig,
} from '@shared/components/select/select';
import { TimeInputComponent } from '@shared/components/time-input/time-input';

@Component({
  selector: 'app-professional-availability',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SelectComponent,
    TimeInputComponent,
  ],
  template: `
    <div class="flex flex-col h-full gap-6">
      <!-- Grid de Días Semanales y Excepciones -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 flex-1 min-h-0">
        <!-- Horarios Recurrentes -->
        <div class="flex flex-col min-h-0">
          <section
            class="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col h-full"
          >
            <h2
              class="text-xs font-bold text-text-dim uppercase tracking-widest mb-4 flex items-center gap-2"
            >
              <span>⏰</span> Horario Semanal
            </h2>

            <div
              class="grid grid-cols-1 gap-2 overflow-y-auto pr-1 custom-scrollbar flex-1"
            >
              @for (day of days; track day.value) {
                <div
                  class="p-3 rounded-xl bg-white/[0.02] border border-white/5"
                >
                  <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-text-main">{{
                        day.label
                      }}</span>
                      <button
                        type="button"
                        (click)="setAddingToDay(day.value)"
                        *ngIf="addingToDay() !== day.value"
                        class="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all"
                      >
                        +
                      </button>
                    </div>
                    @if (
                      getAvailabilityForDay(day.value).length === 0 &&
                      addingToDay() !== day.value
                    ) {
                      <span class="text-[8px] font-bold text-text-dim uppercase"
                        >No laborable</span
                      >
                    }
                  </div>

                  <!-- Formulario Inline -->
                  @if (addingToDay() === day.value) {
                    <form
                      [formGroup]="addForm"
                      (ngSubmit)="addSlot()"
                      class="flex flex-col gap-3 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 animate-in slide-in-from-top-2 duration-200"
                    >
                      <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                          <app-time-input
                            formControlName="startTime"
                            label="Desde"
                          >
                          </app-time-input>
                        </div>
                        <div class="space-y-1">
                          <app-time-input
                            formControlName="endTime"
                            label="Hasta"
                          >
                          </app-time-input>
                        </div>
                        <div class="col-span-2 space-y-1">
                          <label
                            class="text-[9px] uppercase font-bold text-text-dim ml-1"
                            >Sucursal</label
                          >
                          <app-select
                            formControlName="branchId"
                            [config]="branchSelectConfig"
                            [options]="professional()?.branches || []"
                          ></app-select>
                        </div>
                      </div>
                      <div class="flex justify-end gap-2">
                        <button
                          type="button"
                          (click)="cancelAdding()"
                          class="px-3 py-1 text-[10px] font-bold text-text-dim hover:text-text-main transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          [disabled]="addForm.invalid"
                          class="px-4 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  }
                  <div class="flex flex-wrap gap-2">
                    @for (
                      slot of getAvailabilityForDay(day.value);
                      track slot.id
                    ) {
                      <div
                        class="flex items-center gap-2 px-2 py-1 rounded bg-primary/10 border border-primary/20 group/slot"
                      >
                        <span
                          class="text-[10px] font-bold text-primary flex items-center gap-1"
                        >
                          <span class="opacity-40 text-[8px]">+</span>
                          {{ slot.startTime }} - {{ slot.endTime }}
                          <span
                            class="text-[8px] opacity-60 ml-1 font-medium bg-primary/20 px-1 rounded uppercase"
                            *ngIf="slot.branchId"
                          >
                            {{ getBranchName(slot.branchId) }}
                          </span>
                        </span>
                        <button
                          (click)="removeSlot(slot.id)"
                          class="text-[10px] text-primary/40 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        </div>

        <!-- Excepciones -->
        <div class="flex flex-col min-h-0">
          <section
            class="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col h-full"
          >
            <h2
              class="text-xs font-bold text-text-dim uppercase tracking-widest mb-4 flex items-center gap-2"
            >
              <span>📅</span> Bloqueos y Excepciones
            </h2>

            <form
              [formGroup]="exceptionForm"
              (ngSubmit)="addException()"
              class="space-y-3 mb-6"
            >
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label
                    class="text-[9px] uppercase font-bold text-text-dim mb-1 block ml-1"
                    >Fecha</label
                  >
                  <input
                    type="date"
                    formControlName="date"
                    class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-text-main outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label
                    class="text-[9px] uppercase font-bold text-text-dim mb-1 block ml-1"
                    >Tipo</label
                  >
                  <app-select
                    formControlName="type"
                    [config]="typeSelectConfig"
                    [options]="exceptionTypes"
                  ></app-select>
                </div>
              </div>
              <div class="flex gap-2">
                <input
                  type="text"
                  formControlName="reason"
                  class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-text-main outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Motivo (opcional)..."
                />
                <button
                  type="submit"
                  class="bg-accent text-white px-4 py-1.5 rounded-lg hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
                  [disabled]="exceptionForm.invalid"
                >
                  <span class="text-xs font-bold">Bloquear</span>
                </button>
              </div>
            </form>

            <div class="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
              @if (exceptions().length === 0) {
                <div class="py-10 text-center opacity-30 text-xs italic">
                  Sin bloqueos programados
                </div>
              }
              @for (ex of exceptions(); track ex.id) {
                <div
                  class="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center group"
                >
                  <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-bold text-text-main">{{
                        ex.date | date: 'dd MMM, yyyy'
                      }}</span>
                      <span
                        class="text-[8px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold uppercase"
                        >{{ ex.type }}</span
                      >
                    </div>
                    @if (ex.reason) {
                      <span class="text-[9px] text-text-dim">{{
                        ex.reason
                      }}</span>
                    }
                  </div>
                  <button
                    (click)="removeException(ex.id)"
                    class="text-text-dim opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                  >
                    ✕
                  </button>
                </div>
              }
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
})
export class ProfessionalAvailabilityComponent implements OnInit {
  private fb = inject(FormBuilder);
  private professionalsService = inject(ProfessionalsService);
  private snackbar = inject(SnackbarService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @Input() set professionalId(id: string | null) {
    if (id) {
      this.loadProfessional(id);
    }
  }

  professional = signal<Professional | null>(null);
  availability = signal<Availability[]>([]);
  exceptions = signal<AvailabilityException[]>([]);

  addForm: FormGroup;
  exceptionForm: FormGroup;
  isLoading = signal(true);

  days = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' },
  ];

  exceptionTypes = [
    { value: 'BLOCK', label: 'Bloqueo Puntual' },
    { value: 'HOLIDAY', label: 'Feriado / Vacaciones' },
    { value: 'LEAVE', label: 'Licencia' },
    { value: 'OTHER', label: 'Otro' },
  ];

  typeSelectConfig: SelectConfig = {
    displayFn: (item: any) => item.label,
    valueFn: (item: any) => item.value,
    placeholder: 'Tipo',
  };
  constructor() {
    const today = new Date().toISOString().split('T')[0];
    this.addForm = this.fb.group({
      dayOfWeek: [1, [Validators.required]],
      startTime: ['09:00', [Validators.required]],
      endTime: ['18:00', [Validators.required]],
      branchId: [null, [Validators.required]],
    });

    this.exceptionForm = this.fb.group({
      date: [today, [Validators.required]],
      endDate: [null],
      type: ['BLOCK', [Validators.required]],
      reason: [''],
    });
  }

  branchSelectConfig: SelectConfig = {
    displayFn: (item: any) => item.branch.name,
    valueFn: (item: any) => item.branch.id,
    placeholder: 'Sucursal',
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !this.professional()) {
      this.loadProfessional(id);
    }
  }

  loadProfessional(id: string): void {
    this.isLoading.set(true);
    this.professionalsService.findOne(id).subscribe({
      next: (prof) => {
        this.professional.set(prof);
        this.availability.set(prof.availability || []);
        this.exceptions.set(prof.exceptions || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackbar.error('No se pudo cargar la información del profesional');
        this.router.navigate(['/dashboard/professionals']);
      },
    });
  }

  getBranchName(branchId?: string): string {
    if (!branchId) return '';
    const branches = this.professional()?.branches || [];
    const found = branches.find((b) => b.branch.id === branchId);
    return found ? found.branch.name : '';
  }

  getAvailabilityForDay(day: number): Availability[] {
    return this.availability()
      .filter((a) => a.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  addingToDay = signal<number | null>(null);

  setAddingToDay(day: number): void {
    this.addingToDay.set(day);
    const branches = this.professional()?.branches || [];
    const defaultBranchId =
      branches.length === 1 ? branches[0].branch.id : null;

    this.addForm.patchValue({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '18:00',
      branchId: defaultBranchId,
    });
  }

  cancelAdding(): void {
    this.addingToDay.set(null);
  }

  addSlot(): void {
    const prof = this.professional();
    if (this.addForm.invalid || !prof) return;

    const rawValue = this.addForm.value;
    const data = {
      ...rawValue,
      dayOfWeek: Number(rawValue.dayOfWeek),
    };

    this.professionalsService.addAvailability(prof.id, data).subscribe({
      next: (newSlot) => {
        this.availability.set([...this.availability(), newSlot]);
        this.snackbar.success('Horario añadido');
        this.addingToDay.set(null);
      },
      error: (err) =>
        this.snackbar.error(err.error?.message || 'Error al añadir horario'),
    });
  }

  removeSlot(id: string): void {
    const prof = this.professional();
    if (!prof) return;

    this.professionalsService.removeAvailability(prof.id, id).subscribe({
      next: () => {
        this.availability.set(this.availability().filter((a) => a.id !== id));
        this.snackbar.success('Horario eliminado');
      },
      error: () => this.snackbar.error('Error al eliminar horario'),
    });
  }

  addException(): void {
    const prof = this.professional();
    if (this.exceptionForm.invalid || !prof) return;

    this.professionalsService
      .addException(prof.id, this.exceptionForm.value)
      .subscribe({
        next: (newEx) => {
          this.exceptions.set([...this.exceptions(), newEx]);
          this.snackbar.success('Excepción añadida');
          this.exceptionForm.reset({
            date: new Date().toISOString().split('T')[0],
            endDate: null,
            type: 'BLOCK',
            reason: '',
          });
        },
        error: (err) =>
          this.snackbar.error(
            err.error?.message || 'Error al añadir excepción',
          ),
      });
  }

  removeException(id: string): void {
    const prof = this.professional();
    if (!prof) return;

    this.professionalsService.removeException(prof.id, id).subscribe({
      next: () => {
        this.exceptions.set(this.exceptions().filter((e) => e.id !== id));
        this.snackbar.success('Excepción eliminada');
      },
      error: () => this.snackbar.error('Error al eliminar excepción'),
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/professionals']);
  }
}
