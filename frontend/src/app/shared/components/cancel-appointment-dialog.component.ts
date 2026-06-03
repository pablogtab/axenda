import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { IconComponent } from './icon.component';

export interface CancelAppointmentDialogData {
  clientName: string;
  hasPhone: boolean;
}

@Component({
  selector: 'app-cancel-appointment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div
      class="bg-bg-secondary/95 backdrop-blur-md rounded-3xl border border-border shadow-2xl p-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Header Icon -->
      <div
        class="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-red-500/10 border border-red-500/20"
      >
        <app-icon name="warning" class="text-red-400 text-2xl"></app-icon>
      </div>

      <!-- Dialog Header -->
      <div class="space-y-1.5">
        <h2 class="text-xl font-black text-text-main">¿Cancelar Turno?</h2>
        <p class="text-xs text-text-muted leading-relaxed">
          Estás a punto de cancelar el turno de
          <span class="text-text-main font-extrabold">{{
            data.clientName
          }}</span
          >. Esta acción no se puede deshacer.
        </p>
      </div>

      <!-- Notification Option Checkbox (only if client has phone) -->
      <div
        class="bg-surface-subtle/50 border border-border rounded-2xl p-4 text-left space-y-2"
      >
        <label class="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            [(ngModel)]="notifyClient"
            [disabled]="!data.hasPhone"
            class="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/40 focus:ring-2 bg-surface-subtle transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div class="flex flex-col">
            <span
              class="text-xs font-bold text-text-main"
              [class.opacity-50]="!data.hasPhone"
            >
              Notificar cancelación por WhatsApp
            </span>
            <span
              class="text-[10px] text-text-dim mt-0.5"
              *ngIf="data.hasPhone"
            >
              Se enviará un mensaje automático confirmando la cancelación.
            </span>
            <span
              class="text-[10px] text-red-400 font-bold mt-0.5"
              *ngIf="!data.hasPhone"
            >
              El cliente no tiene un teléfono celular registrado.
            </span>
          </div>
        </label>
      </div>

      <!-- Footer Actions -->
      <footer class="flex gap-3 pt-2">
        <button
          class="flex-1 px-4 py-3 rounded-xl border border-border text-text-main font-bold hover:bg-surface-subtle transition-all text-xs cursor-pointer active:scale-95 outline-none"
          (click)="onCancel()"
        >
          No, mantener
        </button>
        <button
          class="flex-[1.2] bg-red-500 hover:bg-red-600 text-white font-extrabold py-3 rounded-xl shadow-lg shadow-red-500/10 transition-all text-xs cursor-pointer active:scale-95 outline-none"
          (click)="onConfirm()"
        >
          Sí, cancelar turno
        </button>
      </footer>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class CancelAppointmentDialogComponent implements OnInit {
  public dialogRef = inject(DialogRef<{ confirm: boolean; notify: boolean }>);
  public data: CancelAppointmentDialogData = inject(DIALOG_DATA) || {
    clientName: 'el cliente',
    hasPhone: false,
  };

  notifyClient = false;

  ngOnInit() {
    if (!this.data.hasPhone) {
      this.notifyClient = false;
    }
  }

  onConfirm(): void {
    this.dialogRef.close({ confirm: true, notify: this.notifyClient });
  }

  onCancel(): void {
    this.dialogRef.close({ confirm: false, notify: false });
  }
}
