import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ProfessionalsService,
  Professional,
} from '@services/professionals.service';
import { SnackbarService } from '@services/snackbar.service';
import { SelectComponent, SelectConfig } from '@shared/components/select';
import { TimeInputComponent } from '@shared/components/time-input';
import { DialogService } from '@core/services/dialog.service';

export interface ExceptionFormData {
  id?: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  type?: string;
  reason?: string;
}

@Component({
  selector: 'app-professional-exception-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectComponent,
    TimeInputComponent,
  ],
  template: `
    <div
      class="bg-bg-secondary rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-md animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div
        class="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0"
      >
        <h3 class="text-base font-bold text-text-main flex items-center gap-2">
          <i class="fa-solid fa-ban text-red-500"></i>
          {{ isEdit ? 'Editar Bloqueo' : 'Nuevo Bloqueo' }}
        </h3>
        <button
          (click)="close()"
          class="text-text-dim hover:text-white transition-colors"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
      >
        <!-- Profesional (Info) -->
        <div
          class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3"
        >
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
            [style.background-color]="professional()?.color + '30'"
            [style.color]="professional()?.color"
          >
            {{ professional()?.firstName?.[0]
            }}{{ professional()?.lastName?.[0] }}
          </div>
          <div class="min-w-0">
            <div
              class="text-[9px] text-text-dim uppercase tracking-wider font-bold leading-tight"
            >
              Profesional
            </div>
            <div class="text-sm font-medium text-text-main truncate">
              {{ professional()?.firstName }} {{ professional()?.lastName }}
            </div>
          </div>
        </div>

        <!-- Fecha y Horas -->
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-0.5 col-span-2">
            <label class="text-[9px] font-bold text-text-dim uppercase ml-1"
              >Fecha</label
            >
            <input
              type="date"
              formControlName="date"
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 text-sm text-text-main focus:border-primary/50 focus:ring-0 outline-none transition-all"
            />
          </div>
          <div class="space-y-0.5">
            <app-time-input formControlName="startTime" label="Desde">
            </app-time-input>
          </div>
          <div class="space-y-0.5">
            <app-time-input formControlName="endTime" label="Hasta">
            </app-time-input>
          </div>
        </div>

        <!-- Tipo y Motivo -->
        <div class="space-y-3">
          <app-select
            formControlName="type"
            [config]="typeConfig"
            [options]="typeOptions"
          >
          </app-select>

          <div class="space-y-0.5">
            <label class="text-[9px] font-bold text-text-dim uppercase ml-1"
              >Motivo (Opcional)</label
            >
            <textarea
              formControlName="reason"
              rows="2"
              placeholder="Ej: Trámite personal, descanso..."
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 text-sm text-text-main focus:border-primary/50 focus:ring-0 outline-none transition-all resize-none"
            ></textarea>
          </div>
        </div>
      </form>

      <!-- Footer Actions (Sticky) -->
      <div
        class="p-4 border-t border-white/5 bg-white/5 shrink-0 flex flex-col gap-2.5"
      >
        <div class="flex gap-2">
          <button
            type="button"
            (click)="close()"
            class="flex-1 px-4 py-2 rounded-xl border border-white/10 text-text-main font-bold hover:bg-white/5 transition-all text-xs"
          >
            Cancelar
          </button>
          <button
            type="submit"
            (click)="onSubmit()"
            [disabled]="form.invalid || isSubmitting()"
            class="flex-[2] bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-bold py-2 rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 text-xs"
          >
            @if (isSubmitting()) {
              <i class="fa-solid fa-circle-notch animate-spin text-[10px]"></i>
              <span class="text-xs">Guardando...</span>
            } @else {
              <i class="fa-solid fa-lock text-[10px]"></i>
              <span class="text-xs">{{
                isEdit ? 'Guardar Cambios' : 'Bloquear Horario'
              }}</span>
            }
          </button>
        </div>

        @if (isEdit) {
          <button
            type="button"
            (click)="onDelete()"
            [disabled]="isSubmitting()"
            class="w-full py-1 text-[9px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
          >
            Eliminar Bloqueo
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ProfessionalExceptionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private professionalsService = inject(ProfessionalsService);
  private snackbar = inject(SnackbarService);
  private dialogService = inject(DialogService);

  form!: FormGroup;
  professional = signal<Professional | null>(null);
  isSubmitting = signal(false);
  isEdit = false;

  typeOptions = [
    { value: 'BLOCK', label: 'Bloqueo Puntual', color: '#f87171' },
    { value: 'HOLIDAY', label: 'Vacaciones', color: '#fbbf24' },
    { value: 'LEAVE', label: 'Licencia Médica', color: '#60a5fa' },
    { value: 'OTHER', label: 'Otro', color: '#94a3b8' },
  ];

  typeConfig: SelectConfig<any> = {
    label: 'Tipo de Bloqueo',
    displayFn: (t) => t.label,
    valueFn: (t) => t.value,
    colorFn: (t) => t.color,
  };

  constructor(
    public dialogRef: DialogRef<any>,
    @Inject(DIALOG_DATA) public data: ExceptionFormData,
  ) {
    this.isEdit = !!this.data.id;
    this.form = this.fb.group({
      date: [
        this.data.date ? this.data.date.split('T')[0] : '',
        Validators.required,
      ],
      startTime: [this.data.startTime, Validators.required],
      endTime: [this.data.endTime, Validators.required],
      type: [this.data.type || 'BLOCK', Validators.required],
      reason: [this.data.reason || ''],
    });
  }

  ngOnInit(): void {
    this.professionalsService
      .findOne(this.data.professionalId)
      .subscribe((p) => {
        this.professional.set(p);
      });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);

    if (this.isEdit) {
      // Como no hay endpoint de update directo en service, borramos y creamos
      // O si el backend soporta PATCH en el futuro, se cambia aquí.
      // Por ahora, simularemos la edición borrando y creando uno nuevo para mayor simplicidad dado el service actual
      this.professionalsService
        .removeException(this.data.professionalId, this.data.id!)
        .subscribe({
          next: () => {
            this.createNewException();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.snackbar.error('Error al actualizar el bloqueo');
          },
        });
    } else {
      this.createNewException();
    }
  }

  private createNewException(): void {
    this.professionalsService
      .addException(this.data.professionalId, this.form.value)
      .subscribe({
        next: (res) => {
          this.snackbar.success(
            this.isEdit ? 'Bloqueo actualizado' : 'Bloqueo creado',
          );
          this.dialogRef.close(res);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.snackbar.error('Error al procesar el bloqueo');
        },
      });
  }

  async onDelete(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Eliminar Bloqueo',
      message: '¿Estás seguro de que deseas eliminar este bloqueo de horario?',
      confirmText: 'Eliminar',
      cancelText: 'Volver',
      type: 'danger',
    });

    if (!confirmed) return;

    this.isSubmitting.set(true);
    this.professionalsService
      .removeException(this.data.professionalId, this.data.id!)
      .subscribe({
        next: () => {
          this.snackbar.success('Bloqueo eliminado');
          this.dialogRef.close(true);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.snackbar.error('Error al eliminar el bloqueo');
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
