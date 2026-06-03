import { Injectable, inject } from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog.component';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialog = inject(Dialog);

  async confirm(options: DialogOptions): Promise<boolean> {
    const dialogRef = this.dialog.open<boolean>(ConfirmDialogComponent, {
      data: {
        ...options,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        type: options.type || 'info',
      },
      backdropClass: 'modal-backdrop',
      panelClass: 'modal-panel-confirm',
    });

    const result = await firstValueFrom(dialogRef.closed);
    return !!result;
  }
}
