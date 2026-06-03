import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon.component';

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <div
      class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      [formGroup]="form"
    >
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold text-text-main flex items-center gap-2">
          <app-icon
            name="notifications"
            class="text-primary text-base"
          ></app-icon>
          Notificaciones
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          class="flex items-center justify-between p-4 rounded-xl bg-surface-subtle border border-border hover:bg-surface-subtle-hover transition-all cursor-pointer"
        >
          <div class="flex flex-col gap-0.5">
            <span class="font-bold text-sm text-text-main"
              >Email de Confirmación</span
            >
            <span class="text-xs text-text-muted"
              >Se envía al reservar un turno.</span
            >
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer scale-90"
          >
            <input
              type="checkbox"
              formControlName="confirmEmail"
              class="sr-only peer"
            />
            <div
              class="w-10 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
            ></div>
          </label>
        </div>

        <div
          class="flex items-center justify-between p-4 rounded-xl bg-surface-subtle border border-border hover:bg-surface-subtle-hover transition-all cursor-pointer group"
        >
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm text-text-main"
                >Recordatorio por WhatsApp</span
              >
              <span
                class="text-[8px] text-primary font-bold uppercase tracking-widest bg-primary-glow px-1.5 py-0.5 rounded border border-primary/20"
                >✨ Premium</span
              >
            </div>
            <span class="text-xs text-text-muted"
              >Se envía 24 horas antes.</span
            >
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer scale-90"
          >
            <input
              type="checkbox"
              formControlName="whatsappReminder"
              class="sr-only peer"
            />
            <div
              class="w-10 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
            ></div>
          </label>
        </div>

        <div
          class="flex items-center justify-between p-4 rounded-xl bg-surface-subtle border border-border hover:bg-surface-subtle-hover transition-all cursor-pointer group"
        >
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm text-text-main"
                >Notificación de Cancelación por WhatsApp</span
              >
              <span
                class="text-[8px] text-primary font-bold uppercase tracking-widest bg-primary-glow px-1.5 py-0.5 rounded border border-primary/20"
                >✨ Premium</span
              >
            </div>
            <span class="text-xs text-text-muted"
              >Se envía al cancelar un turno.</span
            >
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer scale-90"
          >
            <input
              type="checkbox"
              formControlName="whatsappCancellation"
              class="sr-only peer"
            />
            <div
              class="w-10 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
            ></div>
          </label>
        </div>
      </div>
    </div>
  `,
})
export class SettingsNotificationsComponent {
  @Input({ required: true }) form!: FormGroup;
}
