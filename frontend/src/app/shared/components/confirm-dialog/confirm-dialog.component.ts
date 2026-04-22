import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
  private dialogService = inject(DialogService);
  state = this.dialogService.dialogState;

  onConfirm(): void {
    this.dialogService.resolve(true);
  }

  onCancel(): void {
    this.dialogService.resolve(false);
  }
}
