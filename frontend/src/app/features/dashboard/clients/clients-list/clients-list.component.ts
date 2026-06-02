import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientsService, Client } from '@services/clients.service';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { TableCellDirective } from '@shared/components/data-table/table-cell.directive';
import { ClientFormComponent } from '../client-form/client-form.component';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ClientFieldDefinition, CustomFieldsService } from '@services/custom-fields.service';
import { BookingInvitationFormComponent } from '../../booking-invitations/components/booking-invitation-form/booking-invitation-form.component';
import { BookingInvitation } from '@services/booking-invitations.service';
import { TenantsService } from '@services/tenants.service';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [FormsModule, DataTableComponent, TableCellDirective, IconComponent],
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.css'
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
  booleanFieldDefinitions = signal<ClientFieldDefinition[]>([]);
  isLoading = signal(true);

  tenantPublicSlug = computed(() => {
    return this.tenantsService.currentTenant()?.publicSlug || '';
  });
  
  // Paginación
  currentPage = signal(1);
  pageSize = signal(15);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  
  private prefetchCache = new Map<string, { items: Client[], total: number }>();

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
        this.booleanFieldDefinitions.set(definitions.filter((definition) => definition.type === 'BOOLEAN'));
      },
      error: () => {
        this.booleanFieldDefinitions.set([]);
      },
    });
  }

  toggleBooleanFieldFilter(fieldId: string): void {
    this.activeBooleanFieldId.set(this.activeBooleanFieldId() === fieldId ? null : fieldId);
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
    this.clientsService.findAll(page, limit, term, fieldId ?? undefined, fieldId ? 'true' : undefined).subscribe({
      next: (res) => {
        this.clients.set(res.items);
        this.totalItems.set(res.total);
        this.isLoading.set(false);
        this.prefetchCache.set(cacheKey, res);
        this.prefetchNextPage();
      },
      error: () => {
        this.isLoading.set(false);
      }
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

    this.clientsService.findAll(nextPage, limit, term, fieldId ?? undefined, fieldId ? 'true' : undefined).subscribe({
      next: (res) => {
        this.prefetchCache.set(cacheKey, res);
      }
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
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  openCreateForm(): void {
    const dialogRef = this.modal.open(ClientFormComponent);
    
    dialogRef.closed.subscribe(result => {
      if (result) {
        this.prefetchCache.clear();
        this.loadClients();
      }
    });
  }

  openEditForm(client: Client): void {
    const dialogRef = this.modal.open(ClientFormComponent, {
      data: client
    });

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.prefetchCache.clear();
        this.loadClients();
      }
    });
  }

  async deleteClient(id: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: '¿Eliminar cliente?',
      message: 'Esta acción eliminará permanentemente al cliente y todo su historial. ¿Estás seguro?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
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
        }
      });
    }
  }

  openInvitationForm(client: Client): void {
    const dialogRef = this.modal.open(BookingInvitationFormComponent, {
      data: { client }
    });

    dialogRef.closed.subscribe(result => {
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
    const active = client.bookingInvitations.find(inv => {
      if (!inv.active) return false;
      if (inv.expiresAt && new Date() > new Date(inv.expiresAt)) return false;
      if (inv.maxUses !== null && inv.maxUses !== undefined && inv.usesCount >= inv.maxUses) return false;
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
    navigator.clipboard.writeText(link).then(() => {
      this.snackbar.success('Link de invitación copiado al portapapeles');
    }).catch(err => {
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

