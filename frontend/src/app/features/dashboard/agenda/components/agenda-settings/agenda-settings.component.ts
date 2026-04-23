import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UserConfigurationService } from '@services/user-configuration.service';

@Component({
  selector: 'app-agenda-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda-settings.component.html',
  styleUrls: ['./agenda-settings.component.css']
})
export class AgendaSettingsComponent {
  private userConfig = inject(UserConfigurationService);
  private dialogRef = inject(DialogRef);

  startHour = this.userConfig.agendaStartHour();
  endHour = this.userConfig.agendaEndHour();

  onStartChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    if (value >= this.endHour) {
      this.startHour = this.endHour - 1;
    } else {
      this.startHour = value;
    }
  }

  onEndChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    if (value <= this.startHour) {
      this.endHour = this.startHour + 1;
    } else {
      this.endHour = value;
    }
  }

  save(): void {
    this.userConfig.updateAgendaHours(this.startHour, this.endHour);
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
