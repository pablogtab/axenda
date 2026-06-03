import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ServicesService,
  BusinessService,
  ServiceCategory,
} from '@services/services.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { DataTableComponent } from '@shared/components/data-table.component';
import { TableCellDirective } from '@shared/components/table-cell.directive';
import { IconComponent } from '@shared/components/icon.component';
import { ServiceFormComponent } from './service-form.component';

type ActiveTab = 'services' | 'categories';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    TableCellDirective,
    IconComponent,
    ServiceFormComponent,
  ],
  template: `
    <div
      class="p-3 sm:p-6 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar"
    >
      @if (currentView() === 'form') {
        <app-service-form
          [service]="selectedService()"
          (cancel)="closeForm()"
          (save)="onFormSaved()"
        >
        </app-service-form>
      } @else {
        <!-- Header -->
        <header class="flex justify-between items-center">
          <div class="header-info">
            <h1 class="text-3xl font-black mb-1 text-gradient">Servicios</h1>
            <p class="text-xs text-text-muted">
              Configura los servicios que ofreces y sus precios.
            </p>
          </div>
          <div class="header-actions">
            @if (activeTab() === 'services') {
              <button
                class="btn-primary !px-4 !py-2.5 !text-sm flex items-center gap-2"
                (click)="openCreateForm()"
              >
                <app-icon name="add_task" class="text-base"></app-icon>
                Nuevo Servicio
              </button>
            } @else {
              <!-- no action button for categories; create is inline -->
            }
          </div>
        </header>

        <!-- Tabs -->
        <div
          class="flex gap-1 p-1 bg-surface-subtle rounded-xl border border-border w-fit"
        >
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            [class.bg-primary]="activeTab() === 'services'"
            [class.text-white]="activeTab() === 'services'"
            [class.shadow-md]="activeTab() === 'services'"
            [class.text-text-muted]="activeTab() !== 'services'"
            [class.hover:text-text-main]="activeTab() !== 'services'"
            (click)="activeTab.set('services')"
          >
            <span class="flex items-center gap-2">
              <app-icon name="design_services" class="text-base"></app-icon>
              Servicios
            </span>
          </button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            [class.bg-primary]="activeTab() === 'categories'"
            [class.text-white]="activeTab() === 'categories'"
            [class.shadow-md]="activeTab() === 'categories'"
            [class.text-text-muted]="activeTab() !== 'categories'"
            [class.hover:text-text-main]="activeTab() !== 'categories'"
            (click)="activeTab.set('categories')"
          >
            <span class="flex items-center gap-2">
              <app-icon name="category" class="text-base"></app-icon>
              Categorías
            </span>
          </button>
        </div>

        <!-- ══ TAB: SERVICIOS ══════════════════════════════════════════════════ -->
        @if (activeTab() === 'services') {
          <div class="search-box-container max-w-sm">
            <app-icon name="search" class="text-base text-text-dim"></app-icon>
            <input
              type="text"
              [value]="searchTerm()"
              (input)="onSearchChange(search.value)"
              #search
              class="search-box-input"
              placeholder="Buscar servicio..."
            />
          </div>

          <div class="card-glass !p-0 overflow-hidden border-border">
            <app-data-table
              [data]="filteredServices()"
              [columns]="[
                'service',
                'category',
                'duration',
                'price',
                'actions',
              ]"
              [headers]="[
                'Servicio',
                'Categoría',
                'Duración',
                'Precio',
                'Acciones',
              ]"
              density="compact"
            >
              <ng-template appTableCell="service" let-service>
                <div class="flex items-center gap-3 py-1">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 shadow-lg"
                    [style.background-color]="service.color || '#6366f1'"
                  ></div>
                  <span
                    class="text-sm font-bold text-text-main truncate leading-tight"
                    >{{ service.name }}</span
                  >
                </div>
              </ng-template>

              <ng-template appTableCell="category" let-service>
                @if (service.category) {
                  <span
                    class="px-2 py-0.5 rounded-full bg-white/5 border border-border text-[11px] font-medium text-text-muted whitespace-nowrap"
                  >
                    {{ service.category.name }}
                  </span>
                } @else {
                  <span class="text-text-dim text-[11px] opacity-40">—</span>
                }
              </ng-template>

              <ng-template appTableCell="duration" let-service>
                <span
                  class="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-black"
                >
                  {{ service.duration }}m
                </span>
              </ng-template>

              <ng-template appTableCell="price" let-service>
                <span class="text-[12px] font-bold text-success">
                  {{
                    service.price
                      ? (service.price | currency: 'ARS' : '$' : '1.0-0')
                      : 'Gratis'
                  }}
                </span>
              </ng-template>

              <ng-template appTableCell="actions" let-service>
                <div class="row-actions">
                  <button
                    (click)="openEditForm(service)"
                    class="btn-icon-small"
                    title="Editar"
                  >
                    <app-icon name="edit" class="text-base"></app-icon>
                  </button>
                  <button
                    (click)="deleteService(service.id)"
                    class="btn-icon-small btn-icon-delete"
                    title="Eliminar"
                  >
                    <app-icon name="delete" class="text-base"></app-icon>
                  </button>
                </div>
              </ng-template>
            </app-data-table>

            @if (filteredServices().length === 0 && !isLoading()) {
              <div class="empty-state py-12">
                <app-icon
                  name="design_services"
                  class="text-4xl mb-4 opacity-10"
                ></app-icon>
                <p class="text-sm">No hay servicios registrados.</p>
              </div>
            }
          </div>
        }

        <!-- ══ TAB: CATEGORÍAS ════════════════════════════════════════════════ -->
        @if (activeTab() === 'categories') {
          <div class="flex flex-col gap-4 max-w-xl">
            <!-- Nueva categoría -->
            <div class="card-glass p-4 flex flex-col gap-3">
              <h3
                class="text-xs font-bold text-text-dim uppercase tracking-wider"
              >
                Nueva Categoría
              </h3>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="input-field flex-1"
                  placeholder="Ej: Tratamientos, Cortes, Coloración..."
                  [value]="newCatName()"
                  (input)="newCatName.set(newCatInput.value)"
                  (keydown.enter)="createCat()"
                  #newCatInput
                />
                <button
                  class="btn-primary !px-4 !py-2 flex items-center gap-2 shrink-0"
                  [disabled]="!newCatName().trim() || isSavingCat()"
                  (click)="createCat()"
                >
                  <app-icon name="add" class="text-base"></app-icon>
                  Agregar
                </button>
              </div>
            </div>

            <!-- Lista de categorías -->
            <div class="card-glass !p-0 overflow-hidden border-border">
              @if (isCatLoading()) {
                <div class="empty-state py-10">
                  <p class="text-sm text-text-dim">Cargando...</p>
                </div>
              } @else if (categories().length === 0) {
                <div class="empty-state py-10">
                  <app-icon
                    name="category"
                    class="text-4xl mb-3 opacity-10"
                  ></app-icon>
                  <p class="text-sm">Sin categorías. Crea una arriba.</p>
                </div>
              } @else {
                <ul class="divide-y divide-border">
                  @for (cat of categories(); track cat.id) {
                    <li
                      class="flex items-center gap-3 px-4 py-3 group/cat hover:bg-white/5 transition-colors"
                    >
                      @if (editingCatId() === cat.id) {
                        <!-- Editing row -->
                        <input
                          type="text"
                          class="input-field flex-1 !py-1.5 !text-sm"
                          [value]="editingCatName()"
                          (input)="editingCatName.set(editInput.value)"
                          (keydown.enter)="saveEditCat(cat)"
                          (keydown.escape)="cancelEditCat()"
                          #editInput
                          autofocus
                        />
                        <button
                          class="btn-primary !px-3 !py-1.5 !text-xs flex items-center gap-1"
                          [disabled]="!editingCatName().trim() || isSavingCat()"
                          (click)="saveEditCat(cat)"
                        >
                          <app-icon name="check" class="text-sm"></app-icon>
                          Guardar
                        </button>
                        <button
                          class="btn-secondary !px-3 !py-1.5 !text-xs"
                          (click)="cancelEditCat()"
                        >
                          Cancelar
                        </button>
                      } @else {
                        <!-- Display row -->
                        <div
                          class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"
                        >
                          <app-icon
                            name="label"
                            class="text-sm text-primary"
                          ></app-icon>
                        </div>
                        <span
                          class="flex-1 text-sm font-semibold text-text-main"
                          >{{ cat.name }}</span
                        >
                        <div
                          class="flex gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity"
                        >
                          <button
                            (click)="startEditCat(cat)"
                            class="btn-icon-small"
                            title="Editar"
                          >
                            <app-icon name="edit" class="text-base"></app-icon>
                          </button>
                          <button
                            (click)="deleteCat(cat)"
                            class="btn-icon-small btn-icon-delete"
                            title="Eliminar"
                          >
                            <app-icon
                              name="delete"
                              class="text-base"
                            ></app-icon>
                          </button>
                        </div>
                      }
                    </li>
                  }
                </ul>
              }
            </div>

            <p class="text-[11px] text-text-dim">
              Si eliminás una categoría, los servicios asociados quedarán sin
              categoría asignada.
            </p>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      /* Refactored to Tailwind CSS */
    `,
  ],
})
export class ServicesListComponent implements OnInit {
  private servicesService = inject(ServicesService);
  private snackbar = inject(SnackbarService);
  private dialog = inject(DialogService);

  // ── Shared ────────────────────────────────────────────────────────────────
  activeTab = signal<ActiveTab>('services');

  // ── Servicios ─────────────────────────────────────────────────────────────
  services = signal<BusinessService[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);
  currentView = signal<'list' | 'form'>('list');
  selectedService = signal<BusinessService | null>(null);

  filteredServices = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.services();
    if (!term) return all;
    return all.filter((s) => s.name.toLowerCase().includes(term));
  });

  // ── Categorías ────────────────────────────────────────────────────────────
  categories = signal<ServiceCategory[]>([]);
  isCatLoading = signal(false);

  // Inline edit state
  editingCatId = signal<string | null>(null);
  editingCatName = signal('');
  newCatName = signal('');
  isSavingCat = signal(false);

  ngOnInit(): void {
    this.loadServices();
    this.loadCategories();
  }

  // ── Services ──────────────────────────────────────────────────────────────
  loadServices(): void {
    this.isLoading.set(true);
    this.servicesService.findAll().subscribe({
      next: (data) => {
        this.services.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openCreateForm(): void {
    this.selectedService.set(null);
    this.currentView.set('form');
  }

  openEditForm(service: BusinessService): void {
    this.selectedService.set(service);
    this.currentView.set('form');
  }

  closeForm(): void {
    this.currentView.set('list');
    this.selectedService.set(null);
  }

  onFormSaved(): void {
    this.closeForm();
    this.loadServices();
  }

  async deleteService(id: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: '¿Eliminar servicio?',
      message: 'Esta acción no se puede deshacer.',
      type: 'danger',
      confirmText: 'Eliminar',
    });
    if (confirmed) {
      this.servicesService.delete(id).subscribe({
        next: () => {
          this.snackbar.success('Servicio eliminado');
          this.loadServices();
        },
        error: () => this.snackbar.error('No se pudo eliminar el servicio'),
      });
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  // ── Categories ────────────────────────────────────────────────────────────
  loadCategories(): void {
    this.isCatLoading.set(true);
    this.servicesService.findAllCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isCatLoading.set(false);
      },
      error: () => this.isCatLoading.set(false),
    });
  }

  startEditCat(cat: ServiceCategory): void {
    this.editingCatId.set(cat.id);
    this.editingCatName.set(cat.name);
  }

  cancelEditCat(): void {
    this.editingCatId.set(null);
    this.editingCatName.set('');
  }

  saveEditCat(cat: ServiceCategory): void {
    const name = this.editingCatName().trim();
    if (!name) return;
    this.isSavingCat.set(true);
    this.servicesService.updateCategory(cat.id, name).subscribe({
      next: () => {
        this.snackbar.success('Categoría actualizada');
        this.cancelEditCat();
        this.loadCategories();
        this.isSavingCat.set(false);
      },
      error: () => {
        this.snackbar.error('Error al actualizar');
        this.isSavingCat.set(false);
      },
    });
  }

  createCat(): void {
    const name = this.newCatName().trim();
    if (!name) return;
    this.isSavingCat.set(true);
    this.servicesService.createCategory(name).subscribe({
      next: () => {
        this.snackbar.success('Categoría creada');
        this.newCatName.set('');
        this.loadCategories();
        this.isSavingCat.set(false);
      },
      error: () => {
        this.snackbar.error('Error al crear');
        this.isSavingCat.set(false);
      },
    });
  }

  async deleteCat(cat: ServiceCategory): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: `¿Eliminar "${cat.name}"?`,
      message:
        'Los servicios con esta categoría quedarán sin categoría asignada.',
      type: 'danger',
      confirmText: 'Eliminar',
    });
    if (confirmed) {
      this.servicesService.deleteCategory(cat.id).subscribe({
        next: () => {
          this.snackbar.success('Categoría eliminada');
          this.loadCategories();
          this.loadServices();
        },
        error: () => this.snackbar.error('No se pudo eliminar'),
      });
    }
  }
}
