import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private activeDialog = signal<DialogOptions | null>(null);
  readonly dialogState = this.activeDialog.asReadonly();
  
  private resultSubject = new Subject<boolean>();

  confirm(options: DialogOptions): Promise<boolean> {
    this.activeDialog.set({
      ...options,
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      type: options.type || 'info'
    });
    
    this.resultSubject = new Subject<boolean>();
    return new Promise((resolve) => {
      this.resultSubject.subscribe((result) => {
        this.activeDialog.set(null);
        resolve(result);
      });
    });
  }

  resolve(result: boolean): void {
    this.resultSubject.next(result);
    this.resultSubject.complete();
  }
}
