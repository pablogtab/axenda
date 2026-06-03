import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchesService, Branch } from '@services/branches.service';
import { SubscriptionService } from '@services/subscription.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';
import { DataTableComponent } from '@shared/components/data-table.component';
import { TableCellDirective } from '@shared/components/table-cell.directive';
import { BranchFormComponent } from './branch-form.component';
import { IconComponent } from '@shared/components/icon.component';

@Component({
  selector: 'app-branches-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    TableCellDirective,
    IconComponent,
  ],
  template: `
    <div
      class="p-3 sm:p-6 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar"
    >
      <header class="flex justify-between items-center">
        <div class="header-info">
          <h1 class="text-3xl font-black mb-1 text-gradient">Sucursales</h1>
          <p class="text-xs text-text-muted">
            Gestiona tus sedes y puntos de atención.
          </p>
        </div>
        <div class="header-actions flex items-center gap-3">
          @if (limitReached() && showLimitFeedback()) {
            <div
              class="hidden md:flex flex-col items-end mr-2 animate-in fade-in slide-in-from-right-2 duration-300"
            >
              <span
                class="text-[10px] font-bold text-amber-500 uppercase tracking-wider"
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
                limitReached() && showLimitFeedback() ? 'lock' : 'add_location'
              }}"
              class="text-lg transition-transform group-hover:scale-110"
            ></app-icon>
            Nueva Sucursal

            @if (limitReached() && showLimitFeedback()) {
              <div
                class="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px]"
              ></div>
            }
          </button>
        </div>
      </header>

      <div class="flex flex-col md:flex-row md:items-center gap-4">
        <div class="search-box-container max-w-sm flex-1">
          <app-icon name="search" class="text-lg text-text-dim"></app-icon>
          <input
            type="text"
            [value]="searchTerm()"
            (input)="onSearchChange(search.value)"
            #search
            placeholder="Buscar sucursal..."
            class="search-box-input"
          />
        </div>

        @if (limitReached() && showLimitFeedback()) {
          <div
            class="flex-1 animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <div
              class="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/80 shadow-lg shadow-amber-500/5"
            >
              <app-icon name="info" class="text-xl text-amber-500"></app-icon>
              <div class="text-xs">
                <span class="font-bold block text-amber-500"
                  >Plan actual al límite</span
                >
                Has alcanzado el máximo de
                <b>{{ subscriptionService.limits()?.maxBranches }}</b>
                sucursales en tu plan.
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

      <div class="card-glass !p-0 overflow-hidden border-border">
        <app-data-table
          [data]="filteredBranches()"
          [columns]="['branch', 'contact', 'active', 'actions']"
          [headers]="['Sucursal', 'Contacto', 'Estado', 'Acciones']"
          density="compact"
        >
          <ng-template appTableCell="branch" let-branch>
            <div class="flex items-center gap-3 py-1">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600/20 to-primary/20 text-text-main flex items-center justify-center border border-indigo-500/20 shadow-lg"
              >
                <app-icon
                  name="location_on"
                  class="text-lg text-indigo-400"
                ></app-icon>
              </div>
              <div class="flex flex-col min-w-0">
                <span
                  class="text-sm font-bold text-text-main truncate leading-tight"
                  >{{ branch.name }}</span
                >
                @if (branch.address) {
                  <span class="text-[10px] text-text-dim truncate opacity-70">{{
                    branch.address
                  }}</span>
                }
              </div>
            </div>
          </ng-template>

          <ng-template appTableCell="contact" let-branch>
            <span class="text-[12px] text-text-muted font-medium">{{
              branch.phone || '-'
            }}</span>
          </ng-template>

          <ng-template appTableCell="active" let-branch>
            <span class="status-indicator" [class.active]="branch.active">
              {{ branch.active ? 'Activa' : 'Baja' }}
            </span>
          </ng-template>

          <ng-template appTableCell="actions" let-branch>
            <div class="row-actions">
              <button
                (click)="openEditForm(branch)"
                class="btn-icon-small"
                title="Editar"
              >
                <app-icon name="edit" class="text-lg"></app-icon>
              </button>
              <button
                (click)="deleteBranch(branch.id)"
                class="btn-icon-small btn-icon-delete"
                title="Eliminar"
              >
                <app-icon name="delete" class="text-lg"></app-icon>
              </button>
            </div>
          </ng-template>
        </app-data-table>

        @if (filteredBranches().length === 0 && !isLoading()) {
          <div class="empty-state py-12">
            <app-icon name="domain" class="text-5xl mb-4 opacity-10"></app-icon>
            <p class="text-sm">No se encontraron sucursales.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* Refactored to Tailwind CSS */
    `,
  ],
})
export class BranchesListComponent implements OnInit {
  private branchesService = inject(BranchesService);
  public subscriptionService = inject(SubscriptionService);
  private snackbar = inject(SnackbarService);
  private dialog = inject(DialogService);
  private modal = inject(ModalService);

  branches = signal<Branch[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);

  filteredBranches = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.branches();
    if (!term) return all;
    return all.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        (b.address && b.address.toLowerCase().includes(term)),
    );
  });

  // Plan limitations
  showLimitFeedback = signal(false);

  limitReached = computed(() => {
    const limits = this.subscriptionService.limits();
    const usage = this.subscriptionService.usage();

    if (!limits || !usage) return false;

    // Si el límite es 0 o negativo, interpretamos como sin límite
    if (limits.maxBranches <= 0) return false;

    return usage.branches >= limits.maxBranches;
  });

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoading.set(true);
    this.branchesService.findAll().subscribe({
      next: (data) => {
        this.branches.set(data);
        this.isLoading.set(false);
        // Si al cargar vemos que ya no estamos al límite, reseteamos el feedback
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
    const ref = this.modal.open(BranchFormComponent);
    ref.closed.subscribe((result) => {
      if (result) {
        this.loadBranches();
        this.subscriptionService.loadStatus();
      }
    });
  }

  openEditForm(branch: Branch): void {
    const ref = this.modal.open(BranchFormComponent, { data: branch });
    ref.closed.subscribe((result) => {
      if (result) this.loadBranches();
    });
  }

  async deleteBranch(id: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: '¿Eliminar sucursal?',
      message:
        'Esta acción no eliminará los datos vinculados pero desactivará la sucursal. ¿Continuar?',
      type: 'danger',
      confirmText: 'Eliminar',
    });

    if (confirmed) {
      this.branchesService.delete(id).subscribe({
        next: () => {
          this.snackbar.success('Sucursal eliminada');
          this.loadBranches();
          this.subscriptionService.loadStatus();
        },
        error: () => this.snackbar.error('No se pudo eliminar la sucursal'),
      });
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }
}
