import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserConfigurationService } from '@services/user-configuration.service';
import { interval, Subscription } from 'rxjs';
import { startOfToday, isSameDay } from 'date-fns';

@Component({
  selector: 'app-agenda-time-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible()) {
      <!-- Contenedor principal que ocupa todo el ancho -->
      <div
        class="absolute left-0 right-0 pointer-events-none z-[45] flex items-center"
        [style.top.px]="topPos()"
      >
        @if (fullWidth()) {
          <!-- Contenedor del punto: Se mantiene sticky para seguir a la columna de horas -->
          <div
            class="sticky left-0 w-[60px] flex justify-end items-center z-[46]"
          >
            <div
              class="w-3 h-3 rounded-full bg-red-500 translate-x-1/2 border-2 border-bg-primary"
            ></div>
          </div>
        } @else {
          <!-- Punto simple al inicio del contenedor -->
          <div
            class="w-3 h-3 rounded-full bg-red-500 -ml-1.5 border-2 border-bg-primary z-[46]"
          ></div>
        }

        <!-- La línea -->
        <div class="flex-1 h-[2px] bg-red-500 shadow-sm opacity-80"></div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    `,
  ],
})
export class AgendaTimeIndicatorComponent implements OnInit, OnDestroy {
  private userConfig = inject(UserConfigurationService);

  slotHeight = input.required<number>();
  viewDate = input.required<Date>(); // En diario es el día, en semanal es el inicio de la semana
  isWeekView = input<boolean>(false);
  fullWidth = input<boolean>(true); // Si es false, no aplica el offset de 60px para la columna de tiempos

  currentTime = signal(new Date());
  private timerSubscription?: Subscription;

  isVisible = computed(() => {
    const now = this.currentTime();
    const startHour = this.userConfig.agendaStartHour();
    const endHour = this.userConfig.agendaEndHour();
    const currentHour = now.getHours();

    const isCurrentTimeInRange =
      currentHour >= startHour && currentHour < endHour;
    if (!isCurrentTimeInRange) return false;

    if (this.isWeekView()) {
      // En vista semanal, verificar si 'hoy' está dentro de los 7 días desde viewDate
      const weekStart = this.viewDate();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return now >= weekStart && now < weekEnd;
    } else {
      // En vista diaria, verificar si es el mismo día
      return isSameDay(now, this.viewDate());
    }
  });

  topPos = computed(() => {
    const now = this.currentTime();
    const startHour = this.userConfig.agendaStartHour();
    const h = this.slotHeight();

    const minutesSinceStart =
      (now.getHours() - startHour) * 60 + now.getMinutes();
    // 15 min = 1 slotHeight
    // 1 min = slotHeight / 15
    // Header is 40px
    return (minutesSinceStart * h) / 15 + 40;
  });

  ngOnInit() {
    // Actualizar cada minuto
    this.timerSubscription = interval(60000).subscribe(() => {
      this.currentTime.set(new Date());
    });
  }

  ngOnDestroy() {
    this.timerSubscription?.unsubscribe();
  }
}
