import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Client, ClientsService } from '@services/clients.service';
import { SnackbarService } from '@services/snackbar.service';
import {
  CustomFieldDefinition,
  CustomFieldListOption,
  CustomFieldType,
  CustomFieldsService,
} from '@services/custom-fields.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="bg-bg-primary border border-border rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full flex flex-col animate-in fade-in zoom-in duration-200"
    >
      <!-- Header -->
      <header
        class="px-6 py-4 border-b border-border bg-surface-subtle flex justify-between items-center"
      >
        <div>
          <h2 class="text-xl font-bold text-text-main">
            {{ isEditing ? '📝 Editar Cliente' : '👤 Nuevo Cliente' }}
          </h2>
          <p class="text-xs text-text-dim mt-1">
            {{
              isEditing
                ? 'Modifica los datos del cliente'
                : 'Registra un nuevo cliente en el sistema'
            }}
          </p>
        </div>
        <button
          (click)="onCancel()"
          class="p-2 hover:bg-surface-subtle-hover rounded-xl transition-all text-text-dim hover:text-text-main"
        >
          ✕
        </button>
      </header>

      <form
        [formGroup]="clientForm"
        (ngSubmit)="onSubmit()"
        class="px-6 py-4 space-y-4 overflow-y-auto max-h-[calc(100dvh-150px)] custom-scrollbar"
      >
        <!-- Nombre y Apellido -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label
              for="firstName"
              class="text-xs font-bold text-text-dim uppercase tracking-wider"
              >Nombre *</label
            >
            <input
              id="firstName"
              type="text"
              formControlName="firstName"
              class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="Ej: Lionel"
            />
            @if (
              clientForm.get('firstName')?.touched &&
              clientForm.get('firstName')?.invalid
            ) {
              <span class="text-[10px] text-error font-medium block ml-1"
                >El nombre es obligatorio</span
              >
            }
          </div>

          <div class="space-y-2">
            <label
              for="lastName"
              class="text-xs font-bold text-text-dim uppercase tracking-wider"
              >Apellido *</label
            >
            <input
              id="lastName"
              type="text"
              formControlName="lastName"
              class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="Ej: Messi"
            />
            @if (
              clientForm.get('lastName')?.touched &&
              clientForm.get('lastName')?.invalid
            ) {
              <span class="text-[10px] text-error font-medium block ml-1"
                >El apellido es obligatorio</span
              >
            }
          </div>
        </div>

        <!-- Email -->
        <div class="space-y-2">
          <label
            for="email"
            class="text-xs font-bold text-text-dim uppercase tracking-wider"
            >Email</label
          >
          <input
            id="email"
            type="email"
            formControlName="email"
            class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="ejemplo@correo.com"
          />
          @if (
            clientForm.get('email')?.touched && clientForm.get('email')?.invalid
          ) {
            <span class="text-[10px] text-error font-medium block ml-1"
              >Email inválido</span
            >
          }
        </div>

        <!-- Teléfono y Documento -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label
              for="phone"
              class="text-xs font-bold text-text-dim uppercase tracking-wider"
              >Teléfono</label
            >
            <input
              id="phone"
              type="text"
              formControlName="phone"
              class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="+54 9 11 ..."
            />
          </div>
          <div class="space-y-2">
            <label
              for="document"
              class="text-xs font-bold text-text-dim uppercase tracking-wider"
              >Documento / CUIT</label
            >
            <input
              id="document"
              type="text"
              formControlName="document"
              class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="DNI o CUIT"
            />
          </div>
        </div>

        <!-- Notas -->
        <div class="space-y-2">
          <label
            for="notes"
            class="text-xs font-bold text-text-dim uppercase tracking-wider"
            >Notas / Observaciones</label
          >
          <textarea
            id="notes"
            formControlName="notes"
            rows="2"
            class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
            placeholder="Detalles relevantes del cliente..."
          ></textarea>
        </div>

        @if (isLoadingCustomFields) {
          <div class="py-2 text-xs text-text-dim">
            Cargando campos personalizados...
          </div>
        }

        @if (customFieldDefinitions().length > 0) {
          <div [formGroup]="customFieldsForm" class="space-y-3 pt-2">
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-border"></div>
              <h3
                class="text-xs font-bold text-text-dim uppercase tracking-wider whitespace-nowrap"
              >
                Campos personalizados
              </h3>
              <div class="h-px flex-1 bg-border"></div>
              <span class="text-[10px] text-text-dim whitespace-nowrap"
                >{{ customFieldDefinitions().length }} configurados</span
              >
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
                    class="inline-flex items-center gap-2 text-sm text-text-main"
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

        <!-- Estado -->
        <div class="flex items-center gap-3 pt-2">
          <input
            id="active"
            type="checkbox"
            formControlName="active"
            class="w-4 h-4 rounded border-border bg-surface-subtle text-primary focus:ring-primary/20 cursor-pointer"
          />
          <label
            for="active"
            class="text-xs font-bold text-text-dim uppercase tracking-wider cursor-pointer"
            >Cliente activo</label
          >
        </div>
      </form>

      <!-- Footer -->
      <footer
        class="px-6 py-4 border-t border-border bg-surface-subtle flex justify-end items-center gap-3"
      >
        <button
          type="button"
          (click)="onCancel()"
          class="px-6 py-2 rounded-xl text-sm font-bold text-text-dim hover:bg-surface-subtle transition-all"
        >
          Cancelar
        </button>
        <button
          (click)="onSubmit()"
          [disabled]="isSubmitting"
          class="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {{
            isSubmitting
              ? 'Guardando...'
              : isEditing
                ? 'Actualizar Cliente'
                : 'Crear Cliente'
          }}
        </button>
      </footer>
    </div>
  `,
  styles: [
    `
      /* Refactored to Tailwind CSS */
    `,
  ],
})
export class ClientFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private customFieldsService = inject(CustomFieldsService);
  private snackbar = inject(SnackbarService);
  private dialogRef = inject(DialogRef);
  private data = inject<Client | null>(DIALOG_DATA);

  clientForm: FormGroup = this.fb.group({
    firstName: [this.data?.firstName || '', [Validators.required]],
    lastName: [this.data?.lastName || '', [Validators.required]],
    email: [this.data?.email || '', [Validators.email]],
    phone: [this.data?.phone || ''],
    document: [this.data?.document || ''],
    notes: [this.data?.notes || ''],
    active: [this.data?.active ?? true],
  });

  isEditing = !!this.data;
  currentClientId: string | null = this.data?.id || null;
  isSubmitting = false;
  isLoadingCustomFields = false;
  customFieldDefinitions = signal<CustomFieldDefinition[]>([]);
  customFieldsForm = this.fb.group({});

  ngOnInit(): void {
    this.loadCustomFields();
  }

  customControlName(fieldId: string): string {
    return `field_${fieldId}`;
  }

  isSelectField(definition: CustomFieldDefinition): boolean {
    return definition.type === 'SELECT';
  }

  getSelectOptions(definition: CustomFieldDefinition): CustomFieldListOption[] {
    return definition.list?.options ?? [];
  }

  getInputType(type: CustomFieldType): string {
    if (type === 'DATE') return 'date';
    if (type === 'NUMBER') return 'number';
    return 'text';
  }

  private loadCustomFields(): void {
    this.isLoadingCustomFields = true;

    const values$ = this.currentClientId
      ? this.customFieldsService.getClientValues(this.currentClientId)
      : of({
          definitions: [] as CustomFieldDefinition[],
          values: [] as Array<{ fieldId: string; value?: string | null }>,
        });

    forkJoin({
      definitions: this.customFieldsService.getDefinitions(),
      existing: values$,
    }).subscribe({
      next: ({ definitions, existing }) => {
        this.customFieldDefinitions.set(definitions);

        const existingMap = new Map(
          existing.values.map((item) => [item.fieldId, item.value ?? '']),
        );
        for (const definition of definitions) {
          const controlName = this.customControlName(definition.id);
          const initialValue = this.isEditing
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

        this.isLoadingCustomFields = false;
      },
      error: () => {
        this.isLoadingCustomFields = false;
        this.snackbar.error('No se pudieron cargar los campos personalizados');
      },
    });
  }

  onSubmit(): void {
    if (this.clientForm.invalid || this.customFieldsForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.customFieldsForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValues = this.clientForm.value;

    // Limpiar campos vacíos para evitar errores de validación en el backend (ej: email "")
    const payload: any = {};
    Object.keys(formValues).forEach((key) => {
      const value = formValues[key];
      if (value !== '' && value !== null && value !== undefined) {
        payload[key] = value;
      }
    });

    const request$ =
      this.isEditing && this.currentClientId
        ? this.clientsService.update(this.currentClientId, payload)
        : this.clientsService.create(payload);

    request$.subscribe({
      next: (res) => {
        const customFieldPayload = this.buildCustomFieldPayload();
        if (!customFieldPayload.length) {
          this.isSubmitting = false;
          this.snackbar.success(
            this.isEditing
              ? 'Cliente actualizado con éxito'
              : 'Cliente creado con éxito',
          );
          this.dialogRef.close(res);
          return;
        }

        this.customFieldsService
          .saveClientValues(res.id, customFieldPayload)
          .subscribe({
            next: () => {
              this.isSubmitting = false;
              this.snackbar.success(
                this.isEditing
                  ? 'Cliente actualizado con éxito'
                  : 'Cliente creado con éxito',
              );
              this.dialogRef.close(res);
            },
            error: (err) => {
              this.isSubmitting = false;
              const msg =
                err.error?.message?.[0] ||
                err.error?.message ||
                'Error al guardar campos personalizados';
              this.snackbar.error(msg);
            },
          });
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message?.[0] || 'Error al guardar el cliente';
        this.snackbar.error(msg);
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
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
