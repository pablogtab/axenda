import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientsService, Client } from '../../../../core/services/clients.service';
import { DataTableComponent, TableCellDirective } from 'shared-ui';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, TableCellDirective],
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.css'
})
export class ClientsListComponent implements OnInit {
  private clientsService = inject(ClientsService);

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

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  getInitials(client: Client): string {
    return `${client.firstName[0]}${client.lastName[0]}`.toUpperCase();
  }
}
