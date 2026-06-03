import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';

@Component({
  selector: 'app-time-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="space-y-2">
      @if (label) {
        <label
          class="text-xs font-bold text-text-dim uppercase tracking-wider block"
        >
          {{ label }}
        </label>
      }

      <div class="relative group">
        <input
          type="text"
          [formControl]="control"
          [placeholder]="placeholder"
          (blur)="onBlur()"
          maxlength="5"
          inputmode="numeric"
          class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-text-dim/30"
        />

        <!-- Icono decorativo de reloj -->
        <div
          class="absolute right-4 top-2.5 text-text-dim/50 group-focus-within:text-primary transition-colors pointer-events-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  `,
})
export class TimeInputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder: string = '00:00';

  value = signal<string>('');

  onChange: any = () => {};
  onTouched: any = () => {};

  // Control interno para el input de texto
  control = new FormControl('');

  constructor() {
    this.control.valueChanges.subscribe((val) => {
      const formatted = this.formatInput(val || '');
      if (formatted !== val) {
        this.control.setValue(formatted, { emitEvent: false });
      }
      this.value.set(formatted);

      // Solo notificar al formulario si la hora está completa (HH:mm)
      if (formatted.length === 5) {
        this.onChange(formatted);
      }
    });
  }

  // Lógica de máscara para HH:mm
  private formatInput(val: string): string {
    // Solo números
    let digits = val.replace(/\D/g, '').substring(0, 4);

    if (digits.length > 2) {
      const hours = digits.substring(0, 2);
      const minutes = digits.substring(2);

      // Validar horas (00-23)
      let h = parseInt(hours);
      if (h > 23) h = 23;
      const hh = h.toString().padStart(2, '0');

      // Validar minutos (00-59)
      let m = parseInt(minutes);
      if (m > 59) m = 59;
      const mm = minutes.length === 2 ? m.toString().padStart(2, '0') : minutes;

      return `${hh}:${mm}`;
    }

    return digits;
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    const val = value || '';
    this.value.set(val);
    this.control.setValue(val, { emitEvent: false });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onBlur(): void {
    // Auto-completar al salir si está incompleto (ej: "8" -> "08:00")
    let val = this.control.value || '';
    if (val && !val.includes(':')) {
      if (val.length === 1) val = '0' + val + ':00';
      else if (val.length === 2) val = val + ':00';
    } else if (val && val.endsWith(':')) {
      val = val + '00';
    }

    const final = this.formatInput(val);
    this.control.setValue(final, { emitEvent: false });
    this.onChange(final);
    this.onTouched();
  }
}
