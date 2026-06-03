import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ProfessionalsService,
  Professional,
} from '@services/professionals.service';
import { SubscriptionService } from '@services/subscription.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { TableCellDirective } from '@shared/components/data-table/table-cell.directive';
import { ProfessionalFormComponent } from '@features/dashboard/professionals/professional-form/professional-form.component';
import { ProfessionalAvailabilityComponent } from '../professional-availability/professional-availability.component';
import { IconComponent } from '@shared/components/icon/icon.component';

// Componente principal para el listado de profesionales
@Component({
  selector: 'app-professionals-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    TableCellDirective,
    ProfessionalFormComponent,
    IconComponent,
  ],
  template: `
    <div
      class="p-3 sm:p-6 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar"
    >
      @if (!isFormOpen()) {
        <!-- Header -->
        <header class="flex justify-between items-center">
          <div class="header-info">
            <h1 class="text-3xl font-black mb-1 text-gradient">
              Profesionales
            </h1>
            <p class="text-xs text-text-muted">
              Gestiona el equipo de trabajo y sus especialidades.
            </p>
          </div>
          <div class="header-actions flex items-center gap-3">
            @if (limitReached() && showLimitFeedback()) {
              <div
                class="hidden md:flex flex-col items-end mr-2 animate-in fade-in slide-in-from-right-2 duration-300"
              >
                <span
                  class="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider"
                  >Límite alcanzado</span
                >
                <span class="text-[9px] text-text-dim"
                  >Mejora tu plan para agregar más</span
                >
              </div>
            }
            <button
              (click)="openCreateForm()"
              [class.opacity-70]="limitReached() && showLimitFeedback()"
              class="btn-primary !px-4 !py-2.5 !text-sm flex items-center gap-2 group relative overflow-hidden"
            >
              <app-icon
                name="{{
                  limitReached() && showLimitFeedback() ? 'lock' : 'person_add'
                }}"
                class="text-lg transition-transform group-hover:scale-110"
              ></app-icon>
              Nuevo Profesional

              @if (limitReached() && showLimitFeedback()) {
                <div
                  class="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px]"
                ></div>
              }
            </button>
          </div>
        </header>

        <!-- Filtros y Alerta de Límite -->
        <div class="flex flex-col md:flex-row md:items-center gap-4">
          <div class="search-box-container max-w-sm flex-1">
            <app-icon name="search" class="text-lg text-text-dim"></app-icon>
            <input
              type="text"
              [ngModel]="searchTerm()"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Buscar profesional..."
              class="search-box-input"
            />
          </div>

          @if (limitReached() && showLimitFeedback()) {
            <div
              class="flex-1 animate-in fade-in slide-in-from-top-2 duration-500"
            >
              <div
                class="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20 text-text-main shadow-lg shadow-warning/5"
              >
                <app-icon name="info" class="text-xl text-warning"></app-icon>
                <div class="text-xs">
                  <span class="font-bold block text-warning"
                    >Plan actual al límite</span
                  >
                  Has alcanzado el máximo de
                  <b class="text-text-main font-black">{{
                    subscriptionService.limits()?.maxProfessionals
                  }}</b>
                  profesionales.
                </div>
                <button
                  (click)="subscriptionService.goToUpgrade()"
                  class="ml-auto text-[10px] font-black bg-amber-500 text-black px-3 py-1.5 rounded-md hover:bg-amber-400 transition-all hover:scale-105 uppercase"
                >
                  Mejorar Plan
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Tabla -->
        <div class="card-glass !p-0 overflow-hidden border-border">
          @if (isLoading()) {
            <div class="flex flex-col justify-center items-center py-12 gap-4">
              <div class="relative">
                <div
                  class="h-12 w-12 border-4 border-primary/10 rounded-full"
                ></div>
                <div
                  class="absolute top-0 left-0 h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
              <p class="text-sm text-text-dim animate-pulse">
                Cargando profesionales...
              </p>
            </div>
          } @else {
            <app-data-table
              [data]="filteredProfessionals()"
              [columns]="['name', 'branches', 'services', 'status', 'actions']"
              [headers]="[
                'Profesional',
                'Sucursales',
                'Especialidades',
                'Estado',
                'Acciones',
              ]"
              density="compact"
            >
              <!-- Nombre del Profesional -->
              <ng-template appTableCell="name" let-item>
                <div class="flex items-center gap-3 py-1">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-lg border border-white/10"
                    [style.background-color]="item.color || '#6366f1'"
                  >
                    {{ item.firstName[0] }}{{ item.lastName[0] }}
                  </div>
                  <div class="min-w-0">
                    <div
                      class="text-sm font-bold text-text-main truncate leading-tight"
                    >
                      {{ item.firstName }} {{ item.lastName }}
                    </div>
                    <div class="text-[10px] text-text-dim truncate opacity-70">
                      {{ item.bio || 'Profesional' }}
                    </div>
                  </div>
                </div>
              </ng-template>

              <!-- Sucursales -->
              <ng-template appTableCell="branches" let-item>
                <div class="flex flex-wrap gap-1">
                  @for (pb of item.branches; track pb.branch.id) {
                    @if (pb.branch.active) {
                      <span
                        class="px-1.5 py-0.5 rounded-md bg-surface-subtle border border-border text-[9px] font-bold text-text-muted"
                      >
                        {{ pb.branch.name }}
                      </span>
                    }
                  } @empty {
                    <span class="text-[9px] text-text-dim italic"
                      >Sin sucursales</span
                    >
                  }
                </div>
              </ng-template>

              <!-- Servicios -->
              <ng-template appTableCell="services" let-item>
                <div class="flex flex-wrap gap-1">
                  @for (ps of item.services; track ps.service.id) {
                    @if (ps.service.active) {
                      <span
                        class="px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[9px] font-black text-primary-dark dark:text-primary"
                      >
                        {{ ps.service.name }}
                      </span>
                    }
                  } @empty {
                    <span class="text-[9px] text-text-dim italic"
                      >Sin especialidades</span
                    >
                  }
                </div>
              </ng-template>

              <!-- Estado -->
              <ng-template appTableCell="status" let-item>
                <span class="status-indicator" [class.active]="item.active">
                  {{ item.active ? 'Activo' : 'Baja' }}
                </span>
              </ng-template>

              <!-- Acciones -->
              <ng-template appTableCell="actions" let-item>
                <div class="row-actions">
                  <button
                    (click)="openEditForm(item)"
                    class="btn-icon-small"
                    title="Editar"
                  >
                    <app-icon name="edit" class="text-lg"></app-icon>
                  </button>
                  <button
                    (click)="deleteProfessional(item.id)"
                    class="btn-icon-small btn-icon-delete"
                    title="Eliminar"
                  >
                    <app-icon name="delete" class="text-lg"></app-icon>
                  </button>
                </div>
              </ng-template>
            </app-data-table>

            @if (filteredProfessionals().length === 0) {
              <div class="empty-state py-12">
                <app-icon
                  name="badge"
                  class="text-5xl mb-4 opacity-10"
                ></app-icon>
                <p class="text-sm">No se encontraron profesionales</p>
              </div>
            }
          }
        </div>
      } @else {
        <div class="animate-in slide-in-from-right duration-300">
          <app-professional-form
            [professionalData]="editingProfessional()"
            (closed)="onFormClosed($event)"
          >
          </app-professional-form>
        </div>
      }
    </div>
  `,
})
export class ProfessionalsListComponent implements OnInit {
  private professionalsService = inject(ProfessionalsService);
  public subscriptionService = inject(SubscriptionService);
  private snackbar = inject(SnackbarService);
  private dialog = inject(DialogService);
  private router = inject(Router);

  professionals = signal<Professional[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);

  // Form State
  isFormOpen = signal(false);
  editingProfessional = signal<Professional | null>(null);

  filteredProfessionals = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.professionals();
    if (!term) return all;
    return all.filter(
      (p) =>
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term),
    );
  });

  // Plan limitations
  showLimitFeedback = signal(false);

  limitReached = computed(() => {
    const limits = this.subscriptionService.limits();
    const usage = this.subscriptionService.usage();

    if (!limits || !usage) return false;

    // Si el límite es 0 o negativo, interpretamos como sin límite (o no definido aún)
    if (limits.maxProfessionals <= 0) return false;

    return usage.professionals >= limits.maxProfessionals;
  });

  ngOnInit(): void {
    this.loadProfessionals();
  }

  loadProfessionals(): void {
    this.isLoading.set(true);
    this.professionalsService.findAll().subscribe({
      next: (data) => {
        this.professionals.set(data);
        this.isLoading.set(false);
        // Si al cargar vemos que ya no estamos al límite (ej: tras borrar), reseteamos el feedback
        if (!this.limitReached()) {
          this.showLimitFeedback.set(false);
        }
      },
      error: () => this.isLoading.set(false),
    });
  }

  openCreateForm(): void {
    if (this.limitReached()) {
      this.showLimitFeedback.set(true);
      return;
    }
    this.editingProfessional.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(professional: Professional): void {
    this.editingProfessional.set(professional);
    this.isFormOpen.set(true);
  }

  onFormClosed(refresh: boolean): void {
    this.isFormOpen.set(false);
    this.editingProfessional.set(null);
    if (refresh) {
      this.loadProfessionals();
      this.subscriptionService.loadStatus();
    }
  }

  async deleteProfessional(id: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: '¿Remover profesional?',
      message: 'Esta acción eliminará definitivamente al profesional',
      type: 'danger',
      confirmText: 'Remover',
    });

    if (confirmed) {
      this.professionalsService.delete(id).subscribe({
        next: () => {
          this.snackbar.success('Profesional removido correctamente');
          this.loadProfessionals();
          this.subscriptionService.loadStatus();
        },
        error: () =>
          this.snackbar.error('Error al intentar remover al profesional'),
      });
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }
}
