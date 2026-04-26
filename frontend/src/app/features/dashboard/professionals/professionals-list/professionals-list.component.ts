import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { TableCellDirective } from '@shared/components/data-table/table-cell.directive';
import { ProfessionalFormComponent } from '@features/dashboard/professionals/professional-form/professional-form.component';
import { ProfessionalAvailabilityComponent } from '../professional-availability/professional-availability.component';

// Componente principal para el listado de profesionales
@Component({
  selector: 'app-professionals-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, TableCellDirective, ProfessionalFormComponent],
  templateUrl: './professionals-list.component.html'
})
export class ProfessionalsListComponent implements OnInit {
  private professionalsService = inject(ProfessionalsService);
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
    return all.filter(p => 
      p.firstName.toLowerCase().includes(term) || 
      p.lastName.toLowerCase().includes(term)
    );
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
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateForm(): void {
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
    }
  }

  openAvailabilityModal(professional: Professional): void {
    this.router.navigate(['/dashboard/professionals', professional.id, 'availability']);
  }

  async deleteProfessional(id: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: '¿Remover profesional?',
      message: 'Esta acción eliminará definitivamente al profesional',
      type: 'danger',
      confirmText: 'Remover'
    });

    if (confirmed) {
      this.professionalsService.delete(id).subscribe({
        next: () => {
          this.snackbar.success('Profesional removido correctamente');
          this.loadProfessionals();
        },
        error: () => this.snackbar.error('Error al intentar remover al profesional')
      });
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }
}
