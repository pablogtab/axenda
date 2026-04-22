import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientsService, Client } from '@services/clients.service';
import { DataTableComponent, TableCellDirective } from 'shared-ui';
import { ClientFormComponent } from '../client-form/client-form.component';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [FormsModule, DataTableComponent, TableCellDirective],
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.css'
})
export class ClientsListComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private snackbar = inject(SnackbarService);
  private dialog = inject(DialogService);
  private modal = inject(ModalService);

  clients = signal<Client[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);
  
  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const allClients = this.clients();
    
    if (!term) return allClients;
    
    return allClients.filter(c => 
      c.firstName.toLowerCase().includes(term) || 
      c.lastName.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.clientsService.findAll().subscribe({
      next: (data) => {
        this.clients.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openCreateForm(): void {
    const dialogRef = this.modal.open(ClientFormComponent);
    
    dialogRef.closed.subscribe(result => {
      if (result) this.loadClients();
    });
  }

  openEditForm(client: Client): void {
    const dialogRef = this.modal.open(ClientFormComponent, {
      data: client
    });

    dialogRef.closed.subscribe(result => {
      if (result) this.loadClients();
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
          this.loadClients();
        },
        error: (err) => {
          this.snackbar.error('No se pudo eliminar el cliente');
          console.error('Error deleting client', err);
        }
      });
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  getInitials(client: Client): string {
    return `${client.firstName[0]}${client.lastName[0]}`.toUpperCase();
  }
}

