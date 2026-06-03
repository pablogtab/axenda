import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ClientFieldDefinition,
  ClientFieldList,
  CustomFieldType,
  CustomFieldsService,
} from '@services/custom-fields.service';
import { SnackbarService } from '@services/snackbar.service';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-settings-custom-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, DragDropModule],
  templateUrl: './settings-custom-fields.component.html',
})
export class SettingsCustomFieldsComponent implements OnInit {
  private customFieldsService = inject(CustomFieldsService);
  private snackbar = inject(SnackbarService);
  private fb = inject(FormBuilder);

  loading = signal(true);
  definitions = signal<ClientFieldDefinition[]>([]);
  lists = signal<ClientFieldList[]>([]);
  editingDefinitionId = signal<string | null>(null);
  editingListId = signal<string | null>(null);
  selectedListId = signal<string | null>(null);
  isReorderingDefinitions = signal(false);
  showCreateDefinitionForm = signal(false);
  showCreateListForm = signal(false);
  activeTab = signal<'fields' | 'lists'>('fields');
  optionSearchTerms = signal<Record<string, string>>({});
  optionCurrentPage = signal<Record<string, number>>({});
  readonly optionPageSize = 10;

  readonly types: Array<{ label: string; value: CustomFieldType }> = [
    { label: 'Texto', value: 'TEXT' },
    { label: 'Numero', value: 'NUMBER' },
    { label: 'Fecha', value: 'DATE' },
    { label: 'Lista', value: 'SELECT' },
    { label: 'Si/No', value: 'BOOLEAN' },
  ];

  definitionForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['TEXT' as CustomFieldType, [Validators.required]],
    listId: [''],
    defaultValue: [''],
    required: [false],
  });

  editDefinitionForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['TEXT' as CustomFieldType, [Validators.required]],
    listId: [''],
    defaultValue: [''],
    required: [false],
  });

  listForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
  });

  editListForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
  });

  optionForms = new Map<string, FormGroup>();

  ngOnInit(): void {
    this.definitionForm.controls.type.valueChanges.subscribe((type) => {
      if (type !== 'SELECT') {
        this.definitionForm.controls.listId.setValue('');
      }
      this.definitionForm.controls.defaultValue.setValue('');
    });

    this.definitionForm.controls.listId.valueChanges.subscribe(() => {
      if (this.definitionForm.controls.type.value === 'SELECT') {
        this.definitionForm.controls.defaultValue.setValue('');
      }
    });

    this.editDefinitionForm.controls.type.valueChanges.subscribe((type) => {
      if (type !== 'SELECT') {
        this.editDefinitionForm.controls.listId.setValue('');
      }
      this.editDefinitionForm.controls.defaultValue.setValue('');
    });

    this.editDefinitionForm.controls.listId.valueChanges.subscribe(() => {
      if (this.editDefinitionForm.controls.type.value === 'SELECT') {
        this.editDefinitionForm.controls.defaultValue.setValue('');
      }
    });

    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.customFieldsService.getDefinitions().subscribe({
      next: (definitions) => {
        this.definitions.set(definitions);
        this.customFieldsService.getLists().subscribe({
          next: (lists) => {
            this.lists.set(lists);
            if (lists.length === 0) {
              this.selectedListId.set(null);
            } else if (!this.selectedListId() || !lists.some((list) => list.id === this.selectedListId())) {
              this.selectedListId.set(lists[0].id);
            }
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.snackbar.error('No se pudieron cargar las listas personalizadas');
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.error('No se pudieron cargar los campos personalizados');
      },
    });
  }

  canCreateMoreDefinitions(): boolean {
    return this.definitions().length < 10;
  }

  setTab(tab: 'fields' | 'lists'): void {
    this.activeTab.set(tab);
  }

  selectList(listId: string): void {
    this.selectedListId.set(listId);
    if (!this.optionCurrentPage()[listId]) {
      this.setOptionPage(listId, 1);
    }
  }

  getSelectedList(): ClientFieldList | null {
    const selectedId = this.selectedListId();
    if (!selectedId) {
      return null;
    }
    return this.lists().find((list) => list.id === selectedId) ?? null;
  }

  createDefinition(): void {
    if (this.definitionForm.invalid) {
      this.definitionForm.markAllAsTouched();
      return;
    }

    const form = this.definitionForm.getRawValue();
    this.customFieldsService.createDefinition({
      name: form.name,
      type: form.type,
      listId: form.type === 'SELECT' ? form.listId || undefined : undefined,
      defaultValue: this.normalizeDefaultValueForApi(form.type, form.defaultValue, form.listId),
      required: form.required,
    }).subscribe({
      next: () => {
        this.snackbar.success('Campo personalizado creado');
        this.definitionForm.reset({ name: '', type: 'TEXT', listId: '', defaultValue: '', required: false });
        this.showCreateDefinitionForm.set(false);
        this.reload();
      },
      error: (err) => {
        const message = err.error?.message?.[0] || err.error?.message || 'No se pudo crear el campo';
        this.snackbar.error(message);
      },
    });
  }

  openCreateDefinitionForm(): void {
    if (!this.canCreateMoreDefinitions()) {
      return;
    }
    this.showCreateDefinitionForm.set(true);
  }

  closeCreateDefinitionForm(): void {
    this.definitionForm.reset({ name: '', type: 'TEXT', listId: '', defaultValue: '', required: false });
    this.showCreateDefinitionForm.set(false);
  }

  startEditDefinition(definition: ClientFieldDefinition): void {
    this.editingDefinitionId.set(definition.id);
    this.editDefinitionForm.reset({
      name: definition.name,
      type: definition.type,
      listId: definition.listId || '',
      defaultValue: definition.defaultValue || '',
      required: definition.required,
    });
  }

  cancelEditDefinition(): void {
    this.editingDefinitionId.set(null);
  }

  saveEditDefinition(definition: ClientFieldDefinition): void {
    if (this.editDefinitionForm.invalid) {
      this.editDefinitionForm.markAllAsTouched();
      return;
    }

    const form = this.editDefinitionForm.getRawValue();
    this.customFieldsService.updateDefinition(definition.id, {
      name: form.name,
      type: form.type,
      listId: form.type === 'SELECT' ? form.listId || undefined : undefined,
      defaultValue: this.normalizeDefaultValueForApi(form.type, form.defaultValue, form.listId),
      required: form.required,
    }).subscribe({
      next: () => {
        this.snackbar.success('Campo actualizado');
        this.editingDefinitionId.set(null);
        this.reload();
      },
      error: (err) => {
        const message = err.error?.message?.[0] || err.error?.message || 'No se pudo actualizar el campo';
        this.snackbar.error(message);
      },
    });
  }

  deleteDefinition(definitionId: string): void {
    this.customFieldsService.deleteDefinition(definitionId).subscribe({
      next: () => {
        this.snackbar.success('Campo eliminado');
        this.reload();
      },
      error: () => {
        this.snackbar.error('No se pudo eliminar el campo');
      },
    });
  }

  createList(): void {
    if (this.listForm.invalid) {
      this.listForm.markAllAsTouched();
      return;
    }

    this.customFieldsService.createList(this.listForm.getRawValue()).subscribe({
      next: () => {
        this.snackbar.success('Lista creada');
        this.listForm.reset({ name: '' });
        this.showCreateListForm.set(false);
        this.reload();
      },
      error: () => {
        this.snackbar.error('No se pudo crear la lista');
      },
    });
  }

  openCreateListForm(): void {
    this.showCreateListForm.set(true);
  }

  closeCreateListForm(): void {
    this.listForm.reset({ name: '' });
    this.showCreateListForm.set(false);
  }

  startEditList(list: ClientFieldList): void {
    this.editingListId.set(list.id);
    this.editListForm.reset({ name: list.name });
  }

  cancelEditList(): void {
    this.editingListId.set(null);
  }

  saveEditList(list: ClientFieldList): void {
    if (this.editListForm.invalid) {
      this.editListForm.markAllAsTouched();
      return;
    }

    this.customFieldsService.updateList(list.id, this.editListForm.getRawValue()).subscribe({
      next: () => {
        this.snackbar.success('Lista actualizada');
        this.editingListId.set(null);
        this.reload();
      },
      error: () => {
        this.snackbar.error('No se pudo actualizar la lista');
      },
    });
  }

  deleteList(listId: string): void {
    this.customFieldsService.deleteList(listId).subscribe({
      next: () => {
        this.snackbar.success('Lista eliminada');
        this.reload();
      },
      error: () => {
        this.snackbar.error('No se pudo eliminar la lista');
      },
    });
  }

  getOptionForm(listId: string) {
    if (!this.optionForms.has(listId)) {
      this.optionForms.set(
        listId,
        this.fb.nonNullable.group({
          label: ['', [Validators.required]],
        }),
      );
    }
    return this.optionForms.get(listId)!;
  }

  addOption(listId: string): void {
    const form = this.getOptionForm(listId);
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.customFieldsService.addOption(listId, form.getRawValue()).subscribe({
      next: () => {
        form.reset({ label: '' });
        this.reload();
      },
      error: () => {
        this.snackbar.error('No se pudo agregar la opcion');
      },
    });
  }

  setOptionSearchTerm(listId: string, term: string): void {
    const current = this.optionSearchTerms();
    this.optionSearchTerms.set({ ...current, [listId]: term });
    this.setOptionPage(listId, 1);
  }

  setOptionPage(listId: string, page: number): void {
    const totalPages = this.getOptionTotalPages(listId);
    const nextPage = Math.max(1, Math.min(page, totalPages));
    const current = this.optionCurrentPage();
    this.optionCurrentPage.set({ ...current, [listId]: nextPage });
  }

  getOptionCurrentPage(listId: string): number {
    return this.optionCurrentPage()[listId] ?? 1;
  }

  getFilteredOptions(list: ClientFieldList) {
    const term = (this.optionSearchTerms()[list.id] ?? '').trim().toLowerCase();
    if (!term) {
      return list.options;
    }
    return list.options.filter((option) => option.label.toLowerCase().includes(term));
  }

  getPagedOptions(list: ClientFieldList) {
    const filtered = this.getFilteredOptions(list);
    const page = this.getOptionCurrentPage(list.id);
    const start = (page - 1) * this.optionPageSize;
    return filtered.slice(start, start + this.optionPageSize);
  }

  getOptionTotalPages(listId: string): number {
    const list = this.lists().find((item) => item.id === listId);
    if (!list) {
      return 1;
    }
    const total = this.getFilteredOptions(list).length;
    return Math.max(1, Math.ceil(total / this.optionPageSize));
  }

  updateOption(listId: string, optionId: string, currentLabel: string): void {
    const label = window.prompt('Nuevo nombre de la opcion', currentLabel);
    if (label === null) return;
    const nextLabel = label.trim();
    if (!nextLabel) return;

    this.customFieldsService.updateOption(listId, optionId, { label: nextLabel }).subscribe({
      next: () => {
        this.reload();
      },
      error: () => {
        this.snackbar.error('No se pudo actualizar la opcion');
      },
    });
  }

  removeOption(listId: string, optionId: string): void {
    this.customFieldsService.removeOption(listId, optionId).subscribe({
      next: () => {
        this.reload();
      },
      error: () => {
        this.snackbar.error('No se pudo eliminar la opcion');
      },
    });
  }

  isSelectType(type: CustomFieldType): boolean {
    return type === 'SELECT';
  }

  onDefinitionDrop(event: CdkDragDrop<ClientFieldDefinition[]>): void {
    if (event.previousIndex === event.currentIndex || this.isReorderingDefinitions()) {
      return;
    }

    const next = [...this.definitions()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);

    const movedDefinition = next[event.currentIndex];
    if (!movedDefinition) {
      return;
    }

    const optimistic = next.map((definition, index) => ({
      ...definition,
      order: index,
    }));

    this.definitions.set(optimistic);
    this.isReorderingDefinitions.set(true);

    this.customFieldsService.updateDefinition(movedDefinition.id, { order: event.currentIndex }).subscribe({
      next: () => {
        this.isReorderingDefinitions.set(false);
        this.reload();
      },
      error: () => {
        this.isReorderingDefinitions.set(false);
        this.snackbar.error('No se pudo reordenar el campo');
        this.reload();
      },
    });
  }

  getDefaultValueInputType(type: CustomFieldType): string {
    if (type === 'NUMBER') return 'number';
    if (type === 'DATE') return 'date';
    return 'text';
  }

  getDefaultOptionsForList(listId: string): Array<{ id: string; label: string }> {
    return this.lists().find((list) => list.id === listId)?.options ?? [];
  }

  formatDefinitionDefaultValue(definition: ClientFieldDefinition): string {
    if (!definition.defaultValue) {
      return '';
    }

    if (definition.type === 'BOOLEAN') {
      return definition.defaultValue === 'true' ? 'SI' : 'NO';
    }

    if (definition.type === 'SELECT') {
      const option = definition.list?.options?.find((item) => item.id === definition.defaultValue);
      return option?.label ?? definition.defaultValue;
    }

    return definition.defaultValue;
  }

  private normalizeDefaultValueForApi(type: CustomFieldType, value: string, listId: string): string | undefined {
    const normalized = value?.toString().trim();
    if (!normalized) {
      return undefined;
    }

    if (type === 'SELECT') {
      if (!listId) {
        return undefined;
      }
      return normalized;
    }

    if (type === 'BOOLEAN') {
      return normalized === 'true' ? 'true' : normalized === 'false' ? 'false' : undefined;
    }

    return normalized;
  }
}
