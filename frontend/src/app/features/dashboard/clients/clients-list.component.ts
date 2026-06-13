import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientsService, Client } from '@services/clients.service';
import { DataTableComponent } from '@shared/components/data-table.component';
import { TableCellDirective } from '@shared/components/table-cell.directive';
import { ClientFormComponent } from './client-form.component';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';
import { IconComponent } from '@shared/components/icon.component';
import {
  CustomFieldDefinition,
  CustomFieldsService,
} from '@services/custom-fields.service';
import { BookingInvitationFormComponent } from '../booking-invitations/components/booking-invitation-form.component';
import { BookingInvitation } from '@services/booking-invitations.service';
import { TenantsService } from '@services/tenants.service';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [FormsModule, DataTableComponent, TableCellDirective, IconComponent],
  template: `
    <div
      class="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6 h-full overflow-y-auto custom-scrollbar"
    >
      <header class="flex justify-between items-center">
        <div class="header-info">
          <h1 class="text-3xl font-black mb-1 text-gradient">Clientes</h1>
          <p class="text-xs text-text-muted">
            Gestiona tu base de datos de clientes y su historial.
          </p>
        </div>
        <div class="header-actions">
          <button
            class="btn-primary !px-4 !py-2.5 !text-sm flex items-center gap-2"
            (click)="openCreateForm()"
          >
            <app-icon name="person_add" class="text-base"></app-icon>
            Nuevo Cliente
          </button>
        </div>
      </header>

      <div class="search-box-container max-w-sm">
        <app-icon name="search" class="text-base text-text-dim"></app-icon>
        <input
          type="text"
          [value]="searchTerm()"
          (input)="onSearchChange(search.value)"
          #search
          class="search-box-input"
          placeholder="Buscar por nombre o email..."
        />
      </div>

      @if (booleanFieldDefinitions().length > 0) {
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="text-[11px] uppercase tracking-wider text-text-dim font-bold"
            >Filtros:</span
          >
          @for (field of booleanFieldDefinitions(); track field.id) {
            <button
              type="button"
              (click)="toggleBooleanFieldFilter(field.id)"
              class="px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
              [class.border-primary]="activeBooleanFieldId() === field.id"
              [class.bg-primary/15]="activeBooleanFieldId() === field.id"
              [class.text-primary]="activeBooleanFieldId() === field.id"
              [class.border-border]="activeBooleanFieldId() !== field.id"
              [class.text-text-muted]="activeBooleanFieldId() !== field.id"
            >
              {{ field.name }}
            </button>
          }
        </div>
      }

      <div
        class="card-glass !p-0 overflow-hidden border-border flex flex-col h-full"
      >
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <app-data-table
            [data]="clients()"
            density="compact"
            [columns]="['client', 'contact', 'tags', 'invitation', 'actions']"
            [headers]="[
              'Cliente',
              'Contacto',
              'Etiquetas',
              'Invitación',
              'Acciones',
            ]"
          >
            <!-- Templates as before -->
            <ng-template appTableCell="client" let-client>
              <div class="flex items-center gap-3 py-1">
                <div
                  class="row-icon-circle !w-8 !h-8 bg-gradient-to-br from-primary/20 to-accent/20 text-text-main border-primary/20 !text-[11px]"
                >
                  {{ getInitials(client) }}
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-text-main leading-tight"
                    >{{ client.firstName }} {{ client.lastName }}</span
                  >
                  @if (client.notes) {
                    <span
                      class="text-[10px] text-text-dim max-w-[180px] truncate"
                      >{{ client.notes }}</span
                    >
                  }
                </div>
              </div>
            </ng-template>

            <ng-template appTableCell="contact" let-client>
              <div class="flex flex-col gap-0">
                <span class="text-[12px] text-text-muted font-medium">{{
                  client.email || '-'
                }}</span>
                <span class="text-[10px] text-text-dim">{{
                  client.phone || '-'
                }}</span>
              </div>
            </ng-template>

            <ng-template appTableCell="tags" let-client>
              <div class="flex flex-wrap gap-1">
                @for (tag of client.tags; track tag.id) {
                  <span
                    class="px-2 py-0 rounded-full text-[9px] font-bold border"
                    [style.background-color]="tag.color + '10'"
                    [style.color]="tag.color"
                    [style.border-color]="tag.color + '20'"
                  >
                    {{ tag.name }}
                  </span>
                }
              </div>
            </ng-template>

            <ng-template appTableCell="invitation" let-client>
              @let activeInv = getActiveInvitation(client);
              @if (activeInv) {
                <div
                  class="flex items-center gap-1.5"
                  (click)="$event.stopPropagation()"
                >
                  <span
                    class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    Activa
                  </span>
                  <button
                    class="btn-icon-small !p-1 text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                    title="Copiar Link"
                    (click)="copyInvitationLink(activeInv.token)"
                  >
                    <app-icon
                      name="content_copy"
                      class="!text-[13px]"
                    ></app-icon>
                  </button>
                  <button
                    class="btn-icon-small !p-1 text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                    title="Compartir por WhatsApp"
                    (click)="
                      shareInvitationOnWhatsapp(activeInv.token, client.phone)
                    "
                  >
                    <app-icon name="share" class="!text-[13px]"></app-icon>
                  </button>
                </div>
              } @else {
                <button
                  class="px-2.5 py-1 rounded-lg border border-border text-[11px] font-bold text-text-muted hover:text-text-main hover:bg-surface-subtle hover:border-text-muted/20 transition-all flex items-center gap-1"
                  (click)="openInvitationForm(client); $event.stopPropagation()"
                >
                  <app-icon name="add" class="!text-[12px]"></app-icon>
                  Crear Link
                </button>
              }
            </ng-template>

            <ng-template appTableCell="actions" let-client>
              <div class="row-actions">
                <button class="btn-icon-small" title="Ver Turnos">
                  <app-icon name="calendar_month" class="text-base"></app-icon>
                </button>
                <button
                  class="btn-icon-small"
                  title="Editar"
                  (click)="openEditForm(client)"
                >
                  <app-icon name="edit" class="text-base"></app-icon>
                </button>
                <button
                  class="btn-icon-small btn-icon-delete"
                  title="Eliminar"
                  (click)="deleteClient(client.id)"
                >
                  <app-icon name="delete" class="text-base"></app-icon>
                </button>
              </div>
            </ng-template>
          </app-data-table>

          @if (clients().length === 0 && !isLoading()) {
            <div class="empty-state py-12">
              <app-icon
                name="group"
                class="text-4xl mb-4 opacity-10"
              ></app-icon>
              <p class="text-sm">No se encontraron clientes.</p>
            </div>
          }

          @if (isLoading()) {
            <div class="empty-state py-12">
              <div class="relative mb-4">
                <div
                  class="h-6 w-6 border-2 border-primary/10 rounded-full"
                ></div>
                <div
                  class="absolute top-0 left-0 h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
              <p class="text-sm">Cargando clientes...</p>
            </div>
          }
        </div>

        <!-- Pagination Footer -->
        @if (totalItems() > 0) {
          <footer
            class="px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-subtle/50"
          >
            <div class="text-xs text-text-dim text-center sm:text-left">
              Mostrando
              <span class="text-text-muted font-bold">{{
                clients().length
              }}</span>
              de
              <span class="text-text-muted font-bold">{{ totalItems() }}</span>
              clientes
            </div>

            <div class="flex items-center gap-2">
              <button
                (click)="prevPage()"
                [disabled]="currentPage() === 1"
                class="btn-icon-small disabled:opacity-20"
              >
                <app-icon name="chevron_left" class="text-base"></app-icon>
              </button>

              <div class="flex items-center gap-1">
                <span
                  class="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded-lg"
                >
                  {{ currentPage() }}
                </span>
                <span
                  class="text-[10px] text-text-dim uppercase font-bold tracking-widest px-1"
                  >de</span
                >
                <span
                  class="text-xs font-bold text-text-muted px-2 py-1 bg-surface-subtle rounded-lg"
                >
                  {{ totalPages() }}
                </span>
              </div>

              <button
                (click)="nextPage()"
                [disabled]="currentPage() === totalPages()"
                class="btn-icon-small disabled:opacity-20"
              >
                <app-icon name="chevron_right" class="text-base"></app-icon>
              </button>
            </div>
          </footer>
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
export class ClientsListComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private snackbar = inject(SnackbarService);
  private dialog = inject(DialogService);
  private modal = inject(ModalService);
  private customFieldsService = inject(CustomFieldsService);
  private tenantsService = inject(TenantsService);

  clients = signal<Client[]>([]);
  searchTerm = signal('');
  activeBooleanFieldId = signal<string | null>(null);
  booleanFieldDefinitions = signal<CustomFieldDefinition[]>([]);
  isLoading = signal(true);

  tenantPublicSlug = computed(() => {
    return this.tenantsService.currentTenant()?.publicSlug || '';
  });

  // Paginación
  currentPage = signal(1);
  pageSize = signal(15);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  private prefetchCache = new Map<string, { items: Client[]; total: number }>();

  constructor() {
    // Reaccionar a cambios en búsqueda o página
    effect(() => {
      const term = this.searchTerm();
      const page = this.currentPage();
      const activeFieldId = this.activeBooleanFieldId();
      // Debounce implícito por el ciclo de vida de signals si se usa con cuidado,
      // pero aquí llamaremos a load directamente.
      this.loadClients();
    });
  }

  ngOnInit(): void {
    this.loadBooleanFieldDefinitions();
  }

  private loadBooleanFieldDefinitions(): void {
    this.customFieldsService.getDefinitions().subscribe({
      next: (definitions) => {
        this.booleanFieldDefinitions.set(
          definitions.filter((definition) => definition.type === 'BOOLEAN'),
        );
      },
      error: () => {
        this.booleanFieldDefinitions.set([]);
      },
    });
  }

  toggleBooleanFieldFilter(fieldId: string): void {
    this.activeBooleanFieldId.set(
      this.activeBooleanFieldId() === fieldId ? null : fieldId,
    );
    this.currentPage.set(1);
    this.prefetchCache.clear();
  }

  loadClients(): void {
    const term = this.searchTerm();
    const page = this.currentPage();
    const limit = this.pageSize();
    const fieldId = this.activeBooleanFieldId();
    const cacheKey = `${term}_${page}_${fieldId ?? 'nofilter'}`;

    if (this.prefetchCache.has(cacheKey)) {
      const cached = this.prefetchCache.get(cacheKey)!;
      this.clients.set(cached.items);
      this.totalItems.set(cached.total);
      this.isLoading.set(false);
      this.prefetchNextPage(); // Intentar pre-cargar la siguiente de todos modos
      return;
    }

    this.isLoading.set(true);
    this.clientsService
      .findAll(
        page,
        limit,
        term,
        fieldId ?? undefined,
        fieldId ? 'true' : undefined,
      )
      .subscribe({
        next: (res) => {
          this.clients.set(res.items);
          this.totalItems.set(res.total);
          this.isLoading.set(false);
          this.prefetchCache.set(cacheKey, res);
          this.prefetchNextPage();
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  private prefetchNextPage(): void {
    const term = this.searchTerm();
    const nextPage = this.currentPage() + 1;
    const limit = this.pageSize();
    const fieldId = this.activeBooleanFieldId();

    if (nextPage > this.totalPages()) return;

    const cacheKey = `${term}_${nextPage}_${fieldId ?? 'nofilter'}`;
    if (this.prefetchCache.has(cacheKey)) return;

    this.clientsService
      .findAll(
        nextPage,
        limit,
        term,
        fieldId ?? undefined,
        fieldId ? 'true' : undefined,
      )
      .subscribe({
        next: (res) => {
          this.prefetchCache.set(cacheKey, res);
        },
      });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1); // Reset a la primera página al buscar
    this.prefetchCache.clear(); // Limpiar cache al cambiar búsqueda
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  openCreateForm(): void {
    const dialogRef = this.modal.open(ClientFormComponent);

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.prefetchCache.clear();
        this.loadClients();
      }
    });
  }

  openEditForm(client: Client): void {
    const dialogRef = this.modal.open(ClientFormComponent, {
      data: client,
    });

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.prefetchCache.clear();
        this.loadClients();
      }
    });
  }

  async deleteClient(id: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: '¿Eliminar cliente?',
      message:
        'Esta acción eliminará permanentemente al cliente y todo su historial. ¿Estás seguro?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (confirmed) {
      this.clientsService.delete(id).subscribe({
        next: () => {
          this.snackbar.success('Cliente eliminado correctamente');
          this.prefetchCache.clear();
          this.loadClients();
        },
        error: (err) => {
          this.snackbar.error('No se pudo eliminar el cliente');
          console.error('Error deleting client', err);
        },
      });
    }
  }

  openInvitationForm(client: Client): void {
    const dialogRef = this.modal.open(BookingInvitationFormComponent, {
      data: { client },
    });

    dialogRef.closed.subscribe((result) => {
      if (result) {
        this.prefetchCache.clear();
        this.loadClients();
      }
    });
  }

  getActiveInvitation(client: Client): BookingInvitation | null {
    if (!client.bookingInvitations || client.bookingInvitations.length === 0) {
      return null;
    }
    const active = client.bookingInvitations.find((inv) => {
      if (!inv.active) return false;
      if (inv.expiresAt && new Date() > new Date(inv.expiresAt)) return false;
      if (
        inv.maxUses !== null &&
        inv.maxUses !== undefined &&
        inv.usesCount >= inv.maxUses
      )
        return false;
      return true;
    });
    return active || null;
  }

  getInvitationLink(token: string): string {
    const base = window.location.origin;
    return `${base}/${this.tenantPublicSlug()}?invitation=${token}`;
  }

  copyInvitationLink(token: string): void {
    const link = this.getInvitationLink(token);
    navigator.clipboard
      .writeText(link)
      .then(() => {
        this.snackbar.success('Link de invitación copiado al portapapeles');
      })
      .catch((err) => {
        console.error('Could not copy link', err);
        this.snackbar.error('Error al copiar el link');
      });
  }

  shareInvitationOnWhatsapp(token: string, phone?: string): void {
    const link = this.getInvitationLink(token);
    const message = `¡Hola! Te comparto este link para que puedas agendar tu turno online\n${link}`;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  getInitials(client: Client): string {
    return `${client.firstName[0]}${client.lastName[0]}`.toUpperCase();
  }
}
