import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicesService, BusinessService } from '@services/services.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { TableCellDirective } from '@shared/components/data-table/table-cell.directive';
import { ServiceFormComponent } from '../service-form/service-form.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, TableCellDirective, IconComponent],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.css'
})
export class ServicesListComponent implements OnInit {
  private servicesService = inject(ServicesService);
  private snackbar = inject(SnackbarService);
  private dialog = inject(DialogService);
  private modal = inject(ModalService);

  services = signal<BusinessService[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);

  filteredServices = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.services();
    if (!term) return all;
    return all.filter(s => s.name.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.isLoading.set(true);
    this.servicesService.findAll().subscribe({
      next: (data) => {
        this.services.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateForm(): void {
    const ref = this.modal.open(ServiceFormComponent);
    ref.closed.subscribe(result => {
      if (result) this.loadServices();
    });
  }

  openEditForm(service: BusinessService): void {
    const ref = this.modal.open(ServiceFormComponent, { data: service });
    ref.closed.subscribe(result => {
      if (result) this.loadServices();
    });
  }

  async deleteService(id: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: '¿Eliminar servicio?',
      message: 'Esta acción no se puede deshacer.',
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.servicesService.delete(id).subscribe({
        next: () => {
          this.snackbar.success('Servicio eliminado');
          this.loadServices();
        },
        error: () => this.snackbar.error('No se pudo eliminar el servicio')
      });
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }
}
