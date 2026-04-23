import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Professional } from '@services/professionals.service';

@Component({
  selector: 'app-agenda-week-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex flex-col h-full bg-bg-primary p-6 items-center justify-center text-text-dim">
      <div class="text-6xl mb-4">🏗️</div>
      <h2 class="text-2xl font-bold text-text-main mb-2">Vista Semanal en Construcción</h2>
      <p class="text-center max-w-md">
        Estamos preparando una vista increíble de 7 días para que puedas ver toda tu semana de un vistazo.
      </p>
      
      <div class="grid grid-cols-7 gap-4 w-full mt-10">
        @for (day of weekDays(); track day) {
          <div class="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <span class="block text-xs uppercase tracking-widest opacity-50 mb-1">{{ day | date:'EEEE' }}</span>
            <span class="text-xl font-bold text-text-main">{{ day | date:'dd' }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class AgendaWeekViewComponent {
  @Input({ required: true }) date!: Date;
  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];

  weekDays = computed(() => {
    const start = startOfWeek(this.date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  });
}
