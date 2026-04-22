import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarService, SnackbarMessage } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.css'
})
export class SnackbarComponent {
  private snackbarService = inject(SnackbarService);
  snackbars = this.snackbarService.snackbars;

  remove(id: number): void {
    this.snackbarService.remove(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  }
}
