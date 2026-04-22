import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchesService, Branch } from '@services/branches.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import { ModalService } from '@services/modal.service';
import { DataTableComponent, TableCellDirective } from 'shared-ui';
import { BranchFormComponent } from '../branch-form/branch-form.component';

@Component({
  selector: 'app-branches-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, TableCellDirective],
  templateUrl: './branches-list.component.html',
  styleUrl: './branches-list.component.css'
})
export class BranchesListComponent implements OnInit {
  private branchesService = inject(BranchesService);
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
    return all.filter(b => b.name.toLowerCase().includes(term) || (b.address && b.address.toLowerCase().includes(term)));
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
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateForm(): void {
    const ref = this.modal.open(BranchFormComponent);
    ref.closed.subscribe(result => {
      if (result) this.loadBranches();
    });
  }

  openEditForm(branch: Branch): void {
    const ref = this.modal.open(BranchFormComponent, { data: branch });
    ref.closed.subscribe(result => {
      if (result) this.loadBranches();
    });
  }

  async deleteBranch(id: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: '¿Eliminar sucursal?',
      message: 'Esta acción no eliminará los datos vinculados pero desactivará la sucursal. ¿Continuar?',
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      this.branchesService.delete(id).subscribe({
        next: () => {
          this.snackbar.success('Sucursal eliminada');
          this.loadBranches();
        },
        error: () => this.snackbar.error('No se pudo eliminar la sucursal')
      });
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }
}
