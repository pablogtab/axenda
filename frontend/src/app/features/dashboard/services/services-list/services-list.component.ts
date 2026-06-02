import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicesService, BusinessService, ServiceCategory } from '@services/services.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { TableCellDirective } from '@shared/components/data-table/table-cell.directive';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ServiceFormComponent } from '../service-form/service-form.component';

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
    ServiceFormComponent
  ],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.css'
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
    return all.filter(s => s.name.toLowerCase().includes(term));
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
      next: (data) => { this.services.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
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
      confirmText: 'Eliminar'
    });
    if (confirmed) {
      this.servicesService.delete(id).subscribe({
        next: () => { this.snackbar.success('Servicio eliminado'); this.loadServices(); },
        error: () => this.snackbar.error('No se pudo eliminar el servicio')
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
      next: (data) => { this.categories.set(data); this.isCatLoading.set(false); },
      error: () => this.isCatLoading.set(false)
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
      error: () => { this.snackbar.error('Error al actualizar'); this.isSavingCat.set(false); }
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
      error: () => { this.snackbar.error('Error al crear'); this.isSavingCat.set(false); }
    });
  }

  async deleteCat(cat: ServiceCategory): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: `¿Eliminar "${cat.name}"?`,
      message: 'Los servicios con esta categoría quedarán sin categoría asignada.',
      type: 'danger',
      confirmText: 'Eliminar'
    });
    if (confirmed) {
      this.servicesService.deleteCategory(cat.id).subscribe({
        next: () => { this.snackbar.success('Categoría eliminada'); this.loadCategories(); this.loadServices(); },
        error: () => this.snackbar.error('No se pudo eliminar')
      });
    }
  }
}
