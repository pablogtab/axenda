import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { IconComponent } from '../icon/icon.component';

export interface CancelAppointmentDialogData {
  clientName: string;
  hasPhone: boolean;
}

@Component({
  selector: 'app-cancel-appointment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './cancel-appointment-dialog.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class CancelAppointmentDialogComponent implements OnInit {
  public dialogRef = inject(DialogRef<{ confirm: boolean; notify: boolean }>);
  public data: CancelAppointmentDialogData = inject(DIALOG_DATA) || { clientName: 'el cliente', hasPhone: false };

  notifyClient = true;

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
