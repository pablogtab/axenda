import { Injectable, inject, Type } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private dialog = inject(Dialog);

  open<T, D = any, R = any>(
    component: Type<T>,
    config?: DialogConfig<D, DialogRef<R, T>>
  ): DialogRef<R, T> {
    return this.dialog.open<R, D, T>(component, {
      ...config,
      backdropClass: 'modal-backdrop',
      panelClass: 'modal-panel',
      // Animación y comportamiento base
      maxWidth: config?.maxWidth || '95vw',
      disableClose: config?.disableClose ?? false,
    });
  }
}
