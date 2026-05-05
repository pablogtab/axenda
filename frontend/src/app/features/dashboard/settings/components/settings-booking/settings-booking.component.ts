import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectComponent, SelectConfig } from '../../../../../shared/components/select/select';

@Component({
  selector: 'app-settings-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectComponent],
  template: `
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" [formGroup]="form">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold text-text-main flex items-center gap-2">
          <span class="material-symbols-rounded text-primary text-base">calendar_month</span> Configuración de Reservas
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div class="col-span-1 md:col-span-2 space-y-4">
          <h3 class="text-sm font-bold text-text-dim uppercase tracking-widest border-b border-border pb-2">Paso a paso en la reserva pública</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex items-center justify-between p-4 rounded-xl bg-surface-subtle border border-border hover:bg-surface-subtle-hover transition-all cursor-pointer">
              <div class="flex flex-col gap-0.5">
                <span class="font-bold text-sm text-text-main">Permitir selección de sucursal</span>
                <span class="text-[10px] text-text-muted">Los clientes podrán elegir a qué local asistir.</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer scale-90">
                <input type="checkbox" formControlName="publicShowBranchSelection" class="sr-only peer">
                <div class="w-10 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div class="flex items-center justify-between p-4 rounded-xl bg-surface-subtle border border-border hover:bg-surface-subtle-hover transition-all cursor-pointer">
              <div class="flex flex-col gap-0.5">
                <span class="font-bold text-sm text-text-main">Permitir selección de profesional</span>
                <span class="text-[10px] text-text-muted">Los clientes podrán elegir quién los atenderá.</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer scale-90">
                <input type="checkbox" formControlName="publicShowProfessionalSelection" class="sr-only peer">
                <div class="w-10 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-bold text-text-dim uppercase tracking-widest border-b border-border pb-2">Anticipación</h3>
          <app-select
            [config]="anticipationMinConfig"
            [options]="anticipationMinOptions"
            formControlName="publicMinBookingTime">
          </app-select>
          <app-select
            [config]="anticipationMaxConfig"
            [options]="anticipationMaxOptions"
            formControlName="publicMaxBookingDays">
          </app-select>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-bold text-text-dim uppercase tracking-widest border-b border-border pb-2">Optimización de agenda</h3>
          <app-select
            [config]="overlapConfig"
            [options]="overlapOptions"
            formControlName="publicMaxOverlapMins">
          </app-select>
          <p class="text-[10px] text-text-muted italic ml-1">Permite solapar los márgenes de los turnos (ej. mientras esperas el color de un cliente, puedes empezar otro).</p>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-bold text-text-dim uppercase tracking-widest border-b border-border pb-2">Cancelaciones</h3>
          <app-select
            [config]="cancellationConfig"
            [options]="cancellationOptions"
            formControlName="cancellationLimit">
          </app-select>
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-surface-subtle border border-border hover:bg-surface-subtle-hover transition-all cursor-pointer">
            <span class="text-sm font-bold text-text-main">Permitir reprogramar</span>
            <label class="relative inline-flex items-center cursor-pointer scale-90">
              <input type="checkbox" formControlName="allowReschedule" class="sr-only peer">
              <div
                class="w-10 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary">
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsBookingComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) anticipationMinConfig!: SelectConfig;
  @Input({ required: true }) anticipationMinOptions!: any[];
  @Input({ required: true }) anticipationMaxConfig!: SelectConfig;
  @Input({ required: true }) anticipationMaxOptions!: any[];
  @Input({ required: true }) overlapConfig!: SelectConfig;
  @Input({ required: true }) overlapOptions!: any[];
  @Input({ required: true }) cancellationConfig!: SelectConfig;
  @Input({ required: true }) cancellationOptions!: any[];
}
