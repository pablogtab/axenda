import { Injectable, inject, Type } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private dialog = inject(Dialog);

  get hasOpenDialogs(): boolean {
    return this.dialog.openDialogs.length > 0;
  }

  open<T, D = any, R = any>(
    component: Type<T>,
    config?: DialogConfig<D, DialogRef<R, T>>
  ): DialogRef<R, T> {
    return this.dialog.open<R, D, T>(component, {
      backdropClass: 'modal-backdrop',
      panelClass: 'modal-panel',
      maxWidth: '95vw',
      disableClose: false,
      ...config
    });
  }
}
