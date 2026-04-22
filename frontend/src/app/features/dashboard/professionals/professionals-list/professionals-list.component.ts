import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfessionalsService, Professional } from '@services/professionals.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';
import { DataTableComponent, TableCellDirective } from 'shared-ui';
import { ProfessionalFormComponent } from '../professional-form/professional-form.component';

@Component({
  selector: 'app-professionals-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, TableCellDirective],
  templateUrl: './professionals-list.component.html'
})
export class ProfessionalsListComponent implements OnInit {
  private professionalsService = inject(ProfessionalsService);
  private snackbar = inject(SnackbarService);
  private dialog = inject(DialogService);
  private modal = inject(ModalService);

  professionals = signal<Professional[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);

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
    const ref = this.modal.open(ProfessionalFormComponent);
    ref.closed.subscribe(result => {
      if (result) this.loadProfessionals();
    });
  }

  openEditForm(professional: Professional): void {
    const ref = this.modal.open(ProfessionalFormComponent, { data: professional });
    ref.closed.subscribe(result => {
      if (result) this.loadProfessionals();
    });
  }

  async deleteProfessional(id: string): Promise<void> {
    // Confirmación de borrado permanente
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
