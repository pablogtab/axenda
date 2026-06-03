import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UserConfigurationService } from '@services/user-configuration.service';

@Component({
  selector: 'app-agenda-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="p-8 bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden max-w-md w-full"
    >
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-2xl font-bold text-text-main flex items-center gap-2">
            <span class="text-primary">⚙️</span> Configuración
          </h2>
          <p class="text-text-dim text-sm mt-1">Ajusta el rango de tu agenda</p>
        </div>
        <button
          (click)="close()"
          class="p-2 hover:bg-surface-subtle rounded-xl transition-colors text-text-dim hover:text-text-main"
        >
          ✕
        </button>
      </div>

      <div class="space-y-10">
        <!-- Visualizador de Rango -->
        <div class="flex justify-between items-end px-2">
          <div class="text-center">
            <span
              class="block text-[10px] uppercase tracking-widest text-text-dim font-bold mb-1"
              >Inicio</span
            >
            <span class="text-2xl font-mono font-bold text-primary"
              >{{ startHour.toString().padStart(2, '0') }}:00</span
            >
          </div>
          <div
            class="h-[2px] flex-1 bg-border mx-4 mb-3 rounded-full relative overflow-hidden"
          >
            <div
              class="absolute h-full bg-primary/50"
              [style.left.%]="(startHour / 24) * 100"
              [style.right.%]="100 - (endHour / 24) * 100"
            ></div>
          </div>
          <div class="text-center">
            <span
              class="block text-[10px] uppercase tracking-widest text-text-dim font-bold mb-1"
              >Fin</span
            >
            <span class="text-2xl font-mono font-bold text-primary"
              >{{ endHour.toString().padStart(2, '0') }}:00</span
            >
          </div>
        </div>

        <!-- Double Slider Container -->
        <div class="relative h-6 flex items-center px-2">
          <div
            class="absolute inset-0 h-1.5 bg-surface-subtle-hover rounded-full my-auto"
          ></div>
          <div
            class="absolute h-1.5 bg-primary rounded-full my-auto shadow-[0_0_8px_rgba(99,102,241,0.3)]"
            [style.left.%]="(startHour / 24) * 100"
            [style.right.%]="100 - (endHour / 24) * 100"
          ></div>

          <input
            type="range"
            min="0"
            max="24"
            [value]="startHour"
            (input)="onStartChange($event)"
            class="absolute inset-0 w-full bg-transparent appearance-none pointer-events-none z-20 start-input"
          />

          <input
            type="range"
            min="0"
            max="24"
            [value]="endHour"
            (input)="onEndChange($event)"
            class="absolute inset-0 w-full bg-transparent appearance-none pointer-events-none z-20 end-input"
            [style.z-index]="startHour > 12 ? 21 : 19"
          />
        </div>

        <!-- Ticks de Horas -->
        <div class="flex justify-between px-2 -mt-6">
          @for (tick of [0, 6, 12, 18, 24]; track tick) {
            <div class="flex flex-col items-center">
              <div class="h-1.5 w-[1px] bg-border mb-1"></div>
              <span class="text-[9px] font-mono text-text-dim"
                >{{ tick }}h</span
              >
            </div>
          }
        </div>

        <div class="pt-4 flex gap-4">
          <button
            (click)="close()"
            class="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-text-dim hover:bg-surface-subtle transition-all border border-border"
          >
            Cancelar
          </button>
          <button
            (click)="save()"
            class="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Animación de entrada */
      @keyframes modalIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      :host > div {
        animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      /* Custom Range Input Styling */
      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        pointer-events: auto;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #ffffff;
        border: 4px solid #6366f1;
        cursor: grab;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        transition: all 0.2s;
      }

      input[type='range']::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
      }

      input[type='range']::-webkit-slider-thumb:active {
        cursor: grabbing;
        transform: scale(0.95);
      }

      input[type='range']::-moz-range-thumb {
        pointer-events: auto;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 4px solid #6366f1;
        cursor: grab;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      }

      /* Ocultar el track por defecto ya que usamos uno custom */
      input[type='range']::-webkit-slider-runnable-track {
        background: transparent;
      }
      input[type='range']::-moz-range-track {
        background: transparent;
      }
    `,
  ],
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
