import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Client, ClientsService } from '@services/clients.service';
import { SnackbarService } from '@services/snackbar.service';
import {
  ClientFieldDefinition,
  ClientFieldListOption,
  CustomFieldType,
  CustomFieldsService,
} from '@services/custom-fields.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.css'
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
    active: [this.data?.active ?? true]
  });

  isEditing = !!this.data;
  currentClientId: string | null = this.data?.id || null;
  isSubmitting = false;
  isLoadingCustomFields = false;
  customFieldDefinitions = signal<ClientFieldDefinition[]>([]);
  customFieldsForm = this.fb.group({});

  ngOnInit(): void {
    this.loadCustomFields();
  }

  customControlName(fieldId: string): string {
    return `field_${fieldId}`;
  }

  isSelectField(definition: ClientFieldDefinition): boolean {
    return definition.type === 'SELECT';
  }

  getSelectOptions(definition: ClientFieldDefinition): ClientFieldListOption[] {
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
      : of({ definitions: [] as ClientFieldDefinition[], values: [] as Array<{ fieldId: string; value?: string | null }> });

    forkJoin({
      definitions: this.customFieldsService.getDefinitions(),
      existing: values$,
    }).subscribe({
      next: ({ definitions, existing }) => {
        this.customFieldDefinitions.set(definitions);

        const existingMap = new Map(existing.values.map((item) => [item.fieldId, item.value ?? '']));
        for (const definition of definitions) {
          const controlName = this.customControlName(definition.id);
          const initialValue = this.isEditing
            ? existingMap.get(definition.id)
            : (definition.defaultValue ?? '');
          const normalizedValue = this.parseIncomingValue(definition.type, initialValue);
          const validators = definition.required && definition.type !== 'BOOLEAN' ? [Validators.required] : [];
          this.customFieldsForm.addControl(controlName, new FormControl(normalizedValue, validators));
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
    Object.keys(formValues).forEach(key => {
      const value = formValues[key];
      if (value !== '' && value !== null && value !== undefined) {
        payload[key] = value;
      }
    });

    const request$ = this.isEditing && this.currentClientId
      ? this.clientsService.update(this.currentClientId, payload)
      : this.clientsService.create(payload);

    request$.subscribe({
      next: (res) => {
        const customFieldPayload = this.buildCustomFieldPayload();
        if (!customFieldPayload.length) {
          this.isSubmitting = false;
          this.snackbar.success(this.isEditing ? 'Cliente actualizado con éxito' : 'Cliente creado con éxito');
          this.dialogRef.close(res);
          return;
        }

        this.customFieldsService.saveClientValues(res.id, customFieldPayload).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.snackbar.success(this.isEditing ? 'Cliente actualizado con éxito' : 'Cliente creado con éxito');
            this.dialogRef.close(res);
          },
          error: (err) => {
            this.isSubmitting = false;
            const msg = err.error?.message?.[0] || err.error?.message || 'Error al guardar campos personalizados';
            this.snackbar.error(msg);
          },
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message?.[0] || 'Error al guardar el cliente';
        this.snackbar.error(msg);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private buildCustomFieldPayload(): Array<{ fieldId: string; value?: string }> {
    const payload: Array<{ fieldId: string; value?: string }> = [];

    for (const definition of this.customFieldDefinitions()) {
      const controlName = this.customControlName(definition.id);
      const rawValue = this.customFieldsForm.get(controlName)?.value;
      const normalized = this.normalizeOutgoingValue(definition.type, rawValue);
      payload.push({ fieldId: definition.id, value: normalized });
    }

    return payload;
  }

  private parseIncomingValue(type: CustomFieldType, rawValue?: string | null): unknown {
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

  private normalizeOutgoingValue(type: CustomFieldType, rawValue: unknown): string | undefined {
    if (type === 'BOOLEAN') {
      return rawValue ? 'true' : 'false';
    }

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return undefined;
    }

    return String(rawValue);
  }
}

