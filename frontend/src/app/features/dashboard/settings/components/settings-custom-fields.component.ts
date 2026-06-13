import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  CustomFieldDefinition,
  CustomFieldList,
  CustomFieldType,
  CustomFieldsService,
} from '@services/custom-fields.service';
import { SnackbarService } from '@services/snackbar.service';
import { IconComponent } from '@shared/components/icon.component';

@Component({
  selector: 'app-settings-custom-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, DragDropModule],
  template: `
    <div class="space-y-8">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          (click)="setTab('fields-clients')"
          class="px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
          [class.border-primary]="activeTab() === 'fields-clients'"
          [class.text-primary]="activeTab() === 'fields-clients'"
          [class.bg-primary/10]="activeTab() === 'fields-clients'"
          [class.border-border]="activeTab() !== 'fields-clients'"
          [class.text-text-muted]="activeTab() !== 'fields-clients'"
        >
          Campos de Clientes
        </button>
        <button
          type="button"
          (click)="setTab('fields-appointments')"
          class="px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
          [class.border-primary]="activeTab() === 'fields-appointments'"
          [class.text-primary]="activeTab() === 'fields-appointments'"
          [class.bg-primary/10]="activeTab() === 'fields-appointments'"
          [class.border-border]="activeTab() !== 'fields-appointments'"
          [class.text-text-muted]="activeTab() !== 'fields-appointments'"
        >
          Campos de Turnos
        </button>
        <button
          type="button"
          (click)="setTab('lists')"
          class="px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
          [class.border-primary]="activeTab() === 'lists'"
          [class.text-primary]="activeTab() === 'lists'"
          [class.bg-primary/10]="activeTab() === 'lists'"
          [class.border-border]="activeTab() !== 'lists'"
          [class.text-text-muted]="activeTab() !== 'lists'"
        >
          Listas de opciones
        </button>
      </div>

      @if (activeTab() === 'fields-clients' || activeTab() === 'fields-appointments') {
        <section class="card-glass p-5 md:p-6 border border-border rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-bold text-text-main">
                {{ activeTab() === 'fields-clients' ? 'Campos de Clientes' : 'Campos de Turnos' }}
              </h3>
              <p class="text-xs text-text-dim mt-1">
                {{
                  activeTab() === 'fields-clients'
                    ? 'Define hasta 10 campos para complementar el perfil del cliente.'
                    : 'Define hasta 10 campos para complementar la información del turno.'
                }}
              </p>
            </div>
            <span class="text-xs text-text-dim"
              >{{ definitions().length }}/10</span
            >
          </div>

          @if (definitions().length === 0 || showCreateDefinitionForm()) {
            <form [formGroup]="definitionForm" class="space-y-4">
              <label class="block">
                <span class="text-xs text-text-dim block mb-1.5"
                  >Nombre del campo</span
                >
                <input
                  formControlName="name"
                  type="text"
                  class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2.5 text-sm text-text-main"
                  placeholder="Ej: Obra Social o Motivo de consulta"
                />
              </label>

              <div class="grid grid-cols-1 grid-flow-row gap-4">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                  <label class="block lg:col-span-3">
                    <span class="text-xs text-text-dim block mb-1.5">Tipo</span>
                    <select
                      formControlName="type"
                      class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2.5 text-sm text-text-main"
                    >
                      @for (type of types; track type.value) {
                        <option [value]="type.value">{{ type.label }}</option>
                      }
                    </select>
                  </label>

                  <label
                    class="block lg:col-span-5"
                    [class.opacity-40]="
                      !isSelectType(definitionForm.get('type')?.value || 'TEXT')
                    "
                  >
                    <span class="text-xs text-text-dim block mb-1.5"
                      >Lista (si el tipo es SELECT)</span
                    >
                    <select
                      formControlName="listId"
                      [disabled]="
                        !isSelectType(definitionForm.get('type')?.value || 'TEXT')
                      "
                      class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2.5 text-sm text-text-main disabled:opacity-60"
                    >
                      <option value="">Seleccionar</option>
                      @for (list of lists(); track list.id) {
                        <option [value]="list.id">{{ list.name }}</option>
                      }
                    </select>
                  </label>

                  <label class="block lg:col-span-4">
                    <span class="text-xs text-text-dim block mb-1.5"
                      >Valor por defecto</span
                    >
                    @if (definitionForm.get('type')?.value === 'BOOLEAN') {
                      <select
                        formControlName="defaultValue"
                        class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2.5 text-sm text-text-main"
                      >
                        <option value="">Sin valor por defecto</option>
                        <option value="true">SI</option>
                        <option value="false">NO</option>
                      </select>
                    } @else if (definitionForm.get('type')?.value === 'SELECT') {
                      <select
                        formControlName="defaultValue"
                        [disabled]="!definitionForm.get('listId')?.value"
                        class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2.5 text-sm text-text-main disabled:opacity-60"
                      >
                        <option value="">Sin valor por defecto</option>
                        @for (
                          option of getDefaultOptionsForList(
                            definitionForm.get('listId')?.value || ''
                          );
                          track option.id
                        ) {
                          <option [value]="option.id">{{ option.label }}</option>
                        }
                      </select>
                    } @else {
                      <input
                        formControlName="defaultValue"
                        [type]="
                          getDefaultValueInputType(
                            definitionForm.get('type')?.value || 'TEXT'
                          )
                        "
                        class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2.5 text-sm text-text-main"
                        placeholder="Opcional"
                      />
                    }
                  </label>
                </div>

                <div
                  class="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3"
                >
                  <div class="flex items-center gap-4">
                    <label
                      class="inline-flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        formControlName="required"
                        class="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      Obligatorio
                    </label>

                    @if (activeTab() === 'fields-appointments') {
                      <label
                        class="inline-flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          formControlName="showInPublicView"
                          class="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                        />
                        Mostrar y rellenar en portal público
                      </label>
                    }
                  </div>

                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      (click)="createDefinition()"
                      [disabled]="!canCreateMoreDefinitions()"
                      class="btn-primary !px-4 !py-2.5 text-xs disabled:opacity-50"
                    >
                      Crear campo
                    </button>
                    @if (definitions().length > 0) {
                      <button
                        type="button"
                        (click)="closeCreateDefinitionForm()"
                        class="px-3 py-2.5 text-xs rounded-xl border border-border text-text-muted hover:text-text-main"
                      >
                        Cancelar
                      </button>
                    }
                  </div>
                </div>
              </div>
            </form>
          } @else {
            <div class="flex justify-end">
              <button
                type="button"
                (click)="openCreateDefinitionForm()"
                [disabled]="!canCreateMoreDefinitions()"
                class="btn-primary !px-4 !py-2.5 text-xs inline-flex items-center gap-2 disabled:opacity-50"
                title="Crear campo"
              >
                <app-icon name="add" class="text-base"></app-icon>
                Nuevo campo
              </button>
            </div>
          }

          @if (!canCreateMoreDefinitions()) {
            <p class="text-xs text-warning mt-3">
              Ya alcanzaste el límite de 10 campos.
            </p>
          }

          @if (definitions().length >= 2) {
            <div class="mt-5">
              <p class="text-[11px] text-text-dim mb-2">
                Arrastra y suelta para definir el orden.
              </p>
            </div>
          }

          <div
            class="space-y-2.5"
            cdkDropList
            [cdkDropListData]="definitions()"
            (cdkDropListDropped)="onDefinitionDrop($event)"
          >
            @for (definition of definitions(); track definition.id) {
              <div
                class="border border-border rounded-xl p-3.5 bg-surface-subtle/40"
                cdkDrag
              >
                @if (editingDefinitionId() === definition.id) {
                  <form [formGroup]="editDefinitionForm" class="space-y-3">
                    <label class="block">
                      <span class="text-xs text-text-dim block mb-1"
                        >Nombre</span
                      >
                      <input
                        formControlName="name"
                        type="text"
                        class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm text-text-main"
                      />
                    </label>

                    <div
                      class="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end"
                    >
                      <label class="block lg:col-span-3">
                        <span class="text-xs text-text-dim block mb-1"
                          >Tipo</span
                        >
                        <select
                          formControlName="type"
                          class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm text-text-main"
                        >
                          @for (type of types; track type.value) {
                            <option [value]="type.value">
                              {{ type.label }}
                            </option>
                          }
                        </select>
                      </label>

                      <label
                        class="block lg:col-span-5"
                        [class.opacity-40]="
                          !isSelectType(
                            editDefinitionForm.get('type')?.value || 'TEXT'
                          )
                        "
                      >
                        <span class="text-xs text-text-dim block mb-1"
                          >Lista</span
                        >
                        <select
                          formControlName="listId"
                          [disabled]="
                            !isSelectType(
                              editDefinitionForm.get('type')?.value || 'TEXT'
                            )
                          "
                          class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm text-text-main disabled:opacity-60"
                        >
                          <option value="">Seleccionar</option>
                          @for (list of lists(); track list.id) {
                            <option [value]="list.id">{{ list.name }}</option>
                          }
                        </select>
                      </label>

                      <label class="block lg:col-span-4">
                        <span class="text-xs text-text-dim block mb-1"
                          >Valor por defecto</span
                        >
                        @if (
                          editDefinitionForm.get('type')?.value === 'BOOLEAN'
                        ) {
                          <select
                            formControlName="defaultValue"
                            class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm text-text-main"
                          >
                            <option value="">Sin valor por defecto</option>
                            <option value="true">SI</option>
                            <option value="false">NO</option>
                          </select>
                        } @else if (
                          editDefinitionForm.get('type')?.value === 'SELECT'
                        ) {
                          <select
                            formControlName="defaultValue"
                            [disabled]="
                              !editDefinitionForm.get('listId')?.value
                            "
                            class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm text-text-main disabled:opacity-60"
                          >
                            <option value="">Sin valor por defecto</option>
                            @for (
                              option of getDefaultOptionsForList(
                                editDefinitionForm.get('listId')?.value || ''
                              );
                              track option.id
                            ) {
                              <option [value]="option.id">
                                {{ option.label }}
                              </option>
                            }
                          </select>
                        } @else {
                          <input
                            formControlName="defaultValue"
                            [type]="
                              getDefaultValueInputType(
                                editDefinitionForm.get('type')?.value || 'TEXT'
                              )
                            "
                            class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm text-text-main"
                            placeholder="Opcional"
                          />
                        }
                      </label>

                      <div
                        class="lg:col-span-12 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-2"
                      >
                        <div class="flex items-center gap-4">
                          <label
                            class="inline-flex items-center gap-1 text-xs text-text-muted cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              formControlName="required"
                              class="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                            />
                            Obligatorio
                          </label>

                          @if (activeTab() === 'fields-appointments') {
                            <label
                              class="inline-flex items-center gap-1 text-xs text-text-muted cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                formControlName="showInPublicView"
                                class="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                              />
                              Mostrar en portal público
                            </label>
                          }
                        </div>

                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            (click)="cancelEditDefinition()"
                            class="px-3 py-2 text-xs rounded-xl border border-border"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            (click)="saveEditDefinition(definition)"
                            class="btn-primary !px-3 !py-2 text-xs"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                } @else {
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-text-main">
                        {{ definition.name }}
                      </p>
                      <p class="text-xs text-text-dim flex flex-wrap items-center gap-x-2">
                        <span>Tipo: {{ definition.type === 'BOOLEAN' ? '(SI/NO)' : definition.type }}</span>
                        @if (definition.defaultValue) {
                          <span>• Defecto: {{ formatDefinitionDefaultValue(definition) }}</span>
                        }
                        @if (definition.required) {
                          <span class="text-error font-medium">• Obligatorio</span>
                        }
                        @if (definition.type === 'SELECT' && definition.list?.name) {
                          <span>• Lista: {{ definition.list?.name }}</span>
                        }
                        @if (definition.entityType === 'APPOINTMENT') {
                          <span class="text-primary font-medium">• Portal: {{ definition.showInPublicView ? 'Visible' : 'Oculto' }}</span>
                        }
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="btn-icon-small cursor-move"
                        cdkDragHandle
                        title="Reordenar"
                      >
                        <app-icon
                          name="drag_indicator"
                          class="text-base"
                        ></app-icon>
                      </button>
                      <button
                        type="button"
                        (click)="startEditDefinition(definition)"
                        class="btn-icon-small"
                        title="Editar"
                      >
                        <app-icon name="edit" class="text-base"></app-icon>
                      </button>
                      <button
                        type="button"
                        (click)="deleteDefinition(definition.id)"
                        class="btn-icon-small btn-icon-delete"
                        title="Eliminar"
                      >
                        <app-icon name="delete" class="text-base"></app-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      @if (activeTab() === 'lists') {
        <section class="card-glass p-5 md:p-6 border border-border rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-bold text-text-main">
                Listas de opciones
              </h3>
              <p class="text-xs text-text-dim mt-1">
                Crea listas de valores para los campos de tipo Lista (SELECT) de tus Clientes o Turnos.
              </p>
            </div>
            <span class="text-xs text-text-dim"
              >{{ lists().length }} listas</span
            >
          </div>

          @if (lists().length === 0 || showCreateListForm()) {
            <form
              [formGroup]="listForm"
              class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
            >
              <label class="block lg:col-span-9">
                <span class="text-xs text-text-dim block mb-1.5"
                  >Nombre de lista</span
                >
                <input
                  formControlName="name"
                  type="text"
                  class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2.5 text-sm text-text-main"
                  placeholder="Ej: Obras sociales o Motivo de visitas"
                />
              </label>
              <div class="lg:col-span-3 lg:justify-end flex items-center gap-2">
                <button
                  type="button"
                  (click)="createList()"
                  class="btn-primary !px-4 !py-2.5 text-xs"
                >
                  Crear lista
                </button>
                @if (lists().length > 0) {
                  <button
                    type="button"
                    (click)="closeCreateListForm()"
                    class="px-3 py-2.5 text-xs rounded-xl border border-border text-text-muted hover:text-text-main"
                  >
                    Cancelar
                  </button>
                }
              </div>
            </form>
          } @else {
            <div class="flex justify-end">
              <button
                type="button"
                (click)="openCreateListForm()"
                class="btn-primary !px-4 !py-2.5 text-xs inline-flex items-center gap-2"
                title="Crear lista"
              >
                <app-icon name="add" class="text-base"></app-icon>
                Nueva lista
              </button>
            </div>
          }

          <div class="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div
              class="xl:col-span-5 border border-border rounded-xl overflow-hidden"
            >
              <table class="w-full text-xs">
                <thead class="bg-surface-subtle/70 text-text-dim">
                  <tr>
                    <th class="text-left px-3 py-2">Lista</th>
                    <th class="text-right px-3 py-2 w-24">Opciones</th>
                    <th class="text-right px-3 py-2 w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (list of lists(); track list.id) {
                    <tr
                      class="border-t border-border/50 cursor-pointer"
                      [class.bg-primary/10]="selectedListId() === list.id"
                      (click)="selectList(list.id)"
                    >
                      <td class="px-3 py-2 text-text-main font-medium">
                        {{ list.name }}
                      </td>
                      <td class="px-3 py-2 text-right text-text-dim">
                        {{ list.options.length }}
                      </td>
                      <td class="px-3 py-2">
                        <div class="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            (click)="
                              $event.stopPropagation(); startEditList(list)
                            "
                            class="btn-icon-small"
                            title="Editar"
                          >
                            <app-icon name="edit" class="text-sm"></app-icon>
                          </button>
                          <button
                            type="button"
                            (click)="
                              $event.stopPropagation(); deleteList(list.id)
                            "
                            class="btn-icon-small btn-icon-delete"
                            title="Eliminar"
                          >
                            <app-icon name="delete" class="text-sm"></app-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                  @if (lists().length === 0) {
                    <tr>
                      <td
                        colspan="3"
                        class="px-3 py-5 text-center text-text-dim"
                      >
                        No hay listas cargadas
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div
              class="xl:col-span-7 border border-border rounded-xl p-3 bg-surface-subtle/30"
            >
              @if (getSelectedList(); as selectedList) {
                <div class="space-y-3">
                  @if (editingListId() === selectedList.id) {
                    <div
                      [formGroup]="editListForm"
                      class="flex flex-wrap items-center gap-2"
                    >
                      <input
                        formControlName="name"
                        type="text"
                        class="flex-1 min-w-[240px] bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm text-text-main"
                      />
                      <button
                        type="button"
                        (click)="saveEditList(selectedList)"
                        class="btn-primary !px-3 !py-2 text-xs"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        (click)="cancelEditList()"
                        class="px-3 py-2 text-xs rounded-xl border border-border"
                      >
                        Cancelar
                      </button>
                    </div>
                  } @else {
                    <div>
                      <p class="text-sm font-semibold text-text-main">
                        {{ selectedList.name }}
                      </p>
                      <p class="text-[11px] text-text-dim mt-0.5">
                        {{ selectedList.options.length }} opciones
                      </p>
                    </div>
                  }

                  <div
                    class="border border-border/70 rounded-xl bg-bg-primary/30 overflow-hidden"
                  >
                    <div
                      class="px-3 py-2 border-b border-border/50 bg-surface-subtle/40"
                    >
                      <input
                        type="text"
                        [value]="optionSearchTerms()[selectedList.id] || ''"
                        (input)="
                          setOptionSearchTerm(selectedList.id, search.value)
                        "
                        #search
                        class="w-full bg-bg-primary/60 border border-border rounded-lg px-3 py-1.5 text-xs text-text-main"
                        placeholder="Buscar opción..."
                      />
                    </div>
                    <div class="max-h-56 overflow-auto custom-scrollbar">
                      <table class="w-full text-xs">
                        <thead
                          class="bg-surface-subtle/70 text-text-dim sticky top-0"
                        >
                          <tr>
                            <th class="text-left px-3 py-2 w-20">#</th>
                            <th class="text-left px-3 py-2">Opción</th>
                            <th class="text-right px-3 py-2 w-32">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (
                            option of getPagedOptions(selectedList);
                            track option.id;
                            let idx = $index
                          ) {
                            <tr class="border-t border-border/50">
                              <td class="px-3 py-2 text-text-dim">
                                {{
                                  (getOptionCurrentPage(selectedList.id) - 1) *
                                    optionPageSize +
                                    idx +
                                    1
                                }}
                              </td>
                              <td class="px-3 py-2 text-text-muted">
                                {{ option.label }}
                              </td>
                              <td class="px-3 py-2">
                                <div
                                  class="flex items-center justify-end gap-1"
                                >
                                  <button
                                    type="button"
                                    (click)="
                                      updateOption(
                                        selectedList.id,
                                        option.id,
                                        option.label
                                      )
                                    "
                                    class="btn-icon-small"
                                    title="Editar opción"
                                  >
                                    <app-icon
                                      name="edit"
                                      class="text-sm"
                                    ></app-icon>
                                  </button>
                                  <button
                                    type="button"
                                    (click)="
                                      removeOption(selectedList.id, option.id)
                                    "
                                    class="btn-icon-small btn-icon-delete"
                                    title="Eliminar opción"
                                  >
                                    <app-icon
                                      name="delete"
                                      class="text-sm"
                                    ></app-icon>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          }
                          @if (getFilteredOptions(selectedList).length === 0) {
                            <tr>
                              <td
                                colspan="3"
                                class="px-3 py-4 text-center text-text-dim"
                              >
                                Sin resultados
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>

                    <div
                      class="px-3 py-2 border-t border-border/50 bg-surface-subtle/40 flex items-center justify-between"
                    >
                      <span class="text-[11px] text-text-dim">
                        {{ getFilteredOptions(selectedList).length }} opciones
                      </span>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          class="btn-icon-small"
                          [disabled]="
                            getOptionCurrentPage(selectedList.id) === 1
                          "
                          (click)="
                            setOptionPage(
                              selectedList.id,
                              getOptionCurrentPage(selectedList.id) - 1
                            )
                          "
                        >
                          <app-icon
                            name="chevron_left"
                            class="text-sm"
                          ></app-icon>
                        </button>
                        <span class="text-[11px] text-text-dim"
                          >{{ getOptionCurrentPage(selectedList.id) }} /
                          {{ getOptionTotalPages(selectedList.id) }}</span
                        >
                        <button
                          type="button"
                          class="btn-icon-small"
                          [disabled]="
                            getOptionCurrentPage(selectedList.id) >=
                            getOptionTotalPages(selectedList.id)
                          "
                          (click)="
                            setOptionPage(
                              selectedList.id,
                              getOptionCurrentPage(selectedList.id) + 1
                            )
                          "
                        >
                          <app-icon
                            name="chevron_right"
                            class="text-sm"
                          ></app-icon>
                        </button>
                      </div>
                    </div>
                  </div>

                  <form
                    [formGroup]="getOptionForm(selectedList.id)"
                    class="space-y-2"
                  >
                    <label class="block">
                      <span class="text-xs text-text-dim block mb-1"
                        >Agregar opción</span
                      >
                      <input
                        formControlName="label"
                        type="text"
                        class="w-full bg-surface-subtle border border-border rounded-xl px-3 py-2 text-sm text-text-main"
                        placeholder="Ej: VIP"
                      />
                    </label>
                    <button
                      type="button"
                      (click)="addOption(selectedList.id)"
                      class="btn-primary !px-3 !py-2 text-xs"
                    >
                      Agregar opción
                    </button>
                  </form>
                </div>
              } @else {
                <div
                  class="h-full min-h-44 flex items-center justify-center text-text-dim text-sm"
                >
                  Selecciona una lista para ver sus valores
                </div>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class SettingsCustomFieldsComponent implements OnInit {
  private customFieldsService = inject(CustomFieldsService);
  private snackbar = inject(SnackbarService);
  private fb = inject(FormBuilder);

  loading = signal(true);
  definitions = signal<CustomFieldDefinition[]>([]);
  lists = signal<CustomFieldList[]>([]);
  editingDefinitionId = signal<string | null>(null);
  editingListId = signal<string | null>(null);
  selectedListId = signal<string | null>(null);
  isReorderingDefinitions = signal(false);
  showCreateDefinitionForm = signal(false);
  showCreateListForm = signal(false);
  activeTab = signal<'fields-clients' | 'fields-appointments' | 'lists'>('fields-clients');
  optionSearchTerms = signal<Record<string, string>>({});
  optionCurrentPage = signal<Record<string, number>>({});
  readonly optionPageSize = 10;

  readonly types: Array<{ label: string; value: CustomFieldType }> = [
    { label: 'Texto', value: 'TEXT' },
    { label: 'Número', value: 'NUMBER' },
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
    showInPublicView: [true],
  });

  editDefinitionForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['TEXT' as CustomFieldType, [Validators.required]],
    listId: [''],
    defaultValue: [''],
    required: [false],
    showInPublicView: [true],
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
    const entityType = this.activeTab() === 'fields-appointments' ? 'APPOINTMENT' : 'CLIENT';
    
    this.customFieldsService.getDefinitions(entityType).subscribe({
      next: (definitions) => {
        this.definitions.set(definitions);
        this.customFieldsService.getLists().subscribe({
          next: (lists) => {
            this.lists.set(lists);
            if (lists.length === 0) {
              this.selectedListId.set(null);
            } else if (
              !this.selectedListId() ||
              !lists.some((list) => list.id === this.selectedListId())
            ) {
              this.selectedListId.set(lists[0].id);
            }
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.snackbar.error(
              'No se pudieron cargar las listas personalizadas',
            );
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

  setTab(tab: 'fields-clients' | 'fields-appointments' | 'lists'): void {
    this.activeTab.set(tab);
    if (tab === 'fields-clients' || tab === 'fields-appointments') {
      this.reload();
    }
  }

  selectList(listId: string): void {
    this.selectedListId.set(listId);
    if (!this.optionCurrentPage()[listId]) {
      this.setOptionPage(listId, 1);
    }
  }

  getSelectedList(): CustomFieldList | null {
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
    const entityType = this.activeTab() === 'fields-appointments' ? 'APPOINTMENT' : 'CLIENT';
    
    this.customFieldsService
      .createDefinition({
        name: form.name,
        type: form.type,
        entityType,
        listId: form.type === 'SELECT' ? form.listId || undefined : undefined,
        defaultValue: this.normalizeDefaultValueForApi(
          form.type,
          form.defaultValue,
          form.listId,
        ),
        required: form.required,
        showInPublicView: entityType === 'APPOINTMENT' ? form.showInPublicView : true,
      })
      .subscribe({
        next: () => {
          this.snackbar.success('Campo personalizado creado');
          this.definitionForm.reset({
            name: '',
            type: 'TEXT',
            listId: '',
            defaultValue: '',
            required: false,
            showInPublicView: true,
          });
          this.showCreateDefinitionForm.set(false);
          this.reload();
        },
        error: (err) => {
          const message =
            err.error?.message?.[0] ||
            err.error?.message ||
            'No se pudo crear el campo';
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
    this.definitionForm.reset({
      name: '',
      type: 'TEXT',
      listId: '',
      defaultValue: '',
      required: false,
      showInPublicView: true,
    });
    this.showCreateDefinitionForm.set(false);
  }

  startEditDefinition(definition: CustomFieldDefinition): void {
    this.editingDefinitionId.set(definition.id);
    this.editDefinitionForm.reset({
      name: definition.name,
      type: definition.type,
      listId: definition.listId || '',
      defaultValue: definition.defaultValue || '',
      required: definition.required,
      showInPublicView: definition.showInPublicView ?? true,
    });
  }

  cancelEditDefinition(): void {
    this.editingDefinitionId.set(null);
  }

  saveEditDefinition(definition: CustomFieldDefinition): void {
    if (this.editDefinitionForm.invalid) {
      this.editDefinitionForm.markAllAsTouched();
      return;
    }

    const form = this.editDefinitionForm.getRawValue();
    this.customFieldsService
      .updateDefinition(definition.id, {
        name: form.name,
        type: form.type,
        listId: form.type === 'SELECT' ? form.listId || undefined : undefined,
        defaultValue: this.normalizeDefaultValueForApi(
          form.type,
          form.defaultValue,
          form.listId,
        ),
        required: form.required,
        showInPublicView: definition.entityType === 'APPOINTMENT' ? form.showInPublicView : true,
      })
      .subscribe({
        next: () => {
          this.snackbar.success('Campo actualizado');
          this.editingDefinitionId.set(null);
          this.reload();
        },
        error: (err) => {
          const message =
            err.error?.message?.[0] ||
            err.error?.message ||
            'No se pudo actualizar el campo';
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

  startEditList(list: CustomFieldList): void {
    this.editingListId.set(list.id);
    this.editListForm.reset({ name: list.name });
  }

  cancelEditList(): void {
    this.editingListId.set(null);
  }

  saveEditList(list: CustomFieldList): void {
    if (this.editListForm.invalid) {
      this.editListForm.markAllAsTouched();
      return;
    }

    this.customFieldsService
      .updateList(list.id, this.editListForm.getRawValue())
      .subscribe({
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
        this.snackbar.error('No se pudo agregar la opción');
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

  getFilteredOptions(list: CustomFieldList) {
    const term = (this.optionSearchTerms()[list.id] ?? '').trim().toLowerCase();
    if (!term) {
      return list.options;
    }
    return list.options.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
  }

  getPagedOptions(list: CustomFieldList) {
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
    const label = window.prompt('Nuevo nombre de la opción', currentLabel);
    if (label === null) return;
    const nextLabel = label.trim();
    if (!nextLabel) return;

    this.customFieldsService
      .updateOption(listId, optionId, { label: nextLabel })
      .subscribe({
        next: () => {
          this.reload();
        },
        error: () => {
          this.snackbar.error('No se pudo actualizar la opción');
        },
      });
  }

  removeOption(listId: string, optionId: string): void {
    this.customFieldsService.removeOption(listId, optionId).subscribe({
      next: () => {
        this.reload();
      },
      error: () => {
        this.snackbar.error('No se pudo eliminar la opción');
      },
    });
  }

  isSelectType(type: CustomFieldType): boolean {
    return type === 'SELECT';
  }

  onDefinitionDrop(event: CdkDragDrop<CustomFieldDefinition[]>): void {
    if (
      event.previousIndex === event.currentIndex ||
      this.isReorderingDefinitions()
    ) {
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

    this.customFieldsService
      .updateDefinition(movedDefinition.id, { order: event.currentIndex })
      .subscribe({
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

  getDefaultOptionsForList(
    listId: string,
  ): Array<{ id: string; label: string }> {
    return this.lists().find((list) => list.id === listId)?.options ?? [];
  }

  formatDefinitionDefaultValue(definition: CustomFieldDefinition): string {
    if (!definition.defaultValue) {
      return '';
    }

    if (definition.type === 'BOOLEAN') {
      return definition.defaultValue === 'true' ? 'SI' : 'NO';
    }

    if (definition.type === 'SELECT') {
      const option = definition.list?.options?.find(
        (item) => item.id === definition.defaultValue,
      );
      return option?.label ?? definition.defaultValue;
    }

    return definition.defaultValue;
  }

  private normalizeDefaultValueForApi(
    type: CustomFieldType,
    value: string,
    listId: string,
  ): string | undefined {
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
      return normalized === 'true'
        ? 'true'
        : normalized === 'false'
          ? 'false'
          : undefined;
    }

    return normalized;
  }
}
