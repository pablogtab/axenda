import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  OnChanges,
  SimpleChanges,
  OnInit,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfDay,
  isToday,
  addMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AppointmentsService,
  Appointment,
} from '@services/appointments.service';
import { Professional } from '@services/professionals.service';
import {
  startOfLocalDate,
  endOfLocalDate,
  toLocalDateStr,
  parseISODateToLocal,
} from '@core/utils/date-utils';

import { AgendaService } from '../../agenda.service';
import { SidebarService } from '@core/services/sidebar.service';

@Component({
  selector: 'app-agenda-month-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full bg-agenda-bg select-none relative">
      <!-- Grid de días -->
      <div class="flex-1 overflow-hidden">
        <div
          class="grid grid-cols-7 h-full month-grid"
          [style.grid-template-rows]="'repeat(' + monthRows() + ', 1fr)'"
        >
          @for (day of monthDays(); track $index) {
            @let dayApps = getAppointmentsForDay(day);
            <div
              class="border-r border-b border-agenda-border p-1 sm:p-2 transition-all hover:bg-agenda-slot-hover flex flex-col gap-0.5 sm:gap-1 relative group/day cursor-pointer overflow-hidden"
              [class.bg-agenda-bg]="!isCurrentMonth(day)"
              [class.bg-primary/5]="
                dropPreviewDate()?.getTime() === day.getTime()
              "
              (click)="onAddAppointment(day, $event)"
            >
              <!-- Cabecera de celda: Día de la semana (Solo primera fila) y Número -->
              <div class="flex flex-col items-center mb-1 relative z-10">
                @if ($index < 7) {
                  <span
                    class="text-[7px] sm:text-[9px] font-black text-text-dim tracking-[0.05em] sm:tracking-[0.1em] uppercase mb-0.5 sm:mb-1"
                    >{{ weekDays[$index] }}</span
                  >
                }
                <div
                  class="h-3 sm:h-4 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                  (click)="onDayClick(day, $event)"
                  [class.w-6]="
                    formatDayNumber(day).length <= 2 &&
                    sidebarService.isMobile()
                  "
                  [class.w-8]="
                    formatDayNumber(day).length <= 2 &&
                    !sidebarService.isMobile()
                  "
                  [class.px-1]="
                    formatDayNumber(day).length > 2 && sidebarService.isMobile()
                  "
                  [class.px-3]="
                    formatDayNumber(day).length > 2 &&
                    !sidebarService.isMobile()
                  "
                  [class.text-text-main]="isCurrentMonth(day) && !isToday(day)"
                  [class.text-text-dim]="!isCurrentMonth(day)"
                >
                  @if (isToday(day)) {
                    <span
                      class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-white flex items-center justify-center"
                      >{{ formatDayNumber(day) }}</span
                    >
                  } @else {
                    <span>{{ formatDayNumber(day) }}</span>
                  }
                </div>
              </div>

              <!-- Lista de turnos y bloqueos -->
              <div
                class="flex-1 flex flex-col gap-0.5 sm:gap-1 overflow-hidden relative z-10"
              >
                <!-- Bloqueos -->
                @for (block of getBlocksForDay(day); track block.id) {
                  <div
                    (click)="onExceptionClick(block, $event)"
                    class="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-0.5 sm:py-1 rounded-sm sm:rounded-md text-[8px] sm:text-[11px] transition-all cursor-pointer bg-agenda-blocked-bg border-l-2 border-agenda-blocked-border hover:brightness-110 group/block"
                    [title]="
                      'Bloqueado: ' +
                      block.startTime +
                      ' - ' +
                      block.endTime +
                      ' | Prof: ' +
                      block.professional.firstName +
                      ' ' +
                      block.professional.lastName +
                      (block.reason ? ' (' + block.reason + ')' : '')
                    "
                  >
                    <div
                      class="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center text-[6px] sm:text-[7px] font-bold text-white shrink-0 shadow-sm"
                      [style.background-color]="
                        block.professional.color || '#ef4444'
                      "
                    >
                      {{ block.professional.firstName[0] }}
                    </div>

                    <span
                      class="font-bold text-agenda-blocked opacity-80 shrink-0 hidden sm:inline text-[9px]"
                      >{{ block.startTime }}-{{ block.endTime }}</span
                    >
                    <span class="truncate text-agenda-blocked/90 font-medium">{{
                      block.reason || 'Bloqueado'
                    }}</span>
                  </div>
                }

                <!-- Turnos -->
                @for (app of dayApps; track app.id) {
                  @if (
                    $index < 5 || agendaService.draggedApp()?.id === app.id
                  ) {
                    <div
                      (pointerdown)="onPointerDown(app, $event)"
                      (click)="onAppClick(app, $event)"
                      class="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-0.5 sm:py-1 rounded-sm sm:rounded-md text-[8px] sm:text-[11px] transition-all cursor-pointer group/appt hover:translate-x-0.5 active:scale-[0.98] active:rotate-1 touch-none"
                      [class.opacity-40]="
                        agendaService.draggedApp()?.id === app.id &&
                        isSameDayAsView(agendaService.draggedAppOriginDate())
                      "
                      [class.opacity-0]="
                        agendaService.draggedApp()?.id === app.id &&
                        !isSameDayAsView(agendaService.draggedAppOriginDate())
                      "
                      [class.pointer-events-none]="
                        agendaService.draggedApp()?.id === app.id
                      "
                      [style.background-color]="app.service.color + '80'"
                      [style.border-left]="
                        (sidebarService.isMobile() ? '2px' : '3px') +
                        ' solid ' +
                        getStatusColor(app.status)
                      "
                    >
                      <div
                        class="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center text-[6px] sm:text-[7px] font-bold text-white shrink-0 shadow-sm"
                        [style.background-color]="
                          app.professional.color || '#6366f1'
                        "
                      >
                        {{ app.professional.firstName[0] }}
                      </div>
                      <span
                        class="font-bold text-text-main opacity-80 shrink-0 hidden sm:inline"
                        >{{ formatTime(app.startTime) }}</span
                      >
                      <span class="truncate text-text-main font-medium">{{
                        app.client.firstName
                      }}</span>
                    </div>
                  }
                }

                @let totalItems = dayApps.length + getBlocksForDay(day).length;
                @if (totalItems > 5) {
                  <div
                    class="px-1 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold text-text-dim mt-auto"
                  >
                    +{{ totalItems - 5 }}
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      @if (isLoading() && !agendaService.isDragging()) {
        <div
          class="absolute inset-0 bg-surface/20 backdrop-blur-[1px] flex items-center justify-center z-[110]"
        >
          <div
            class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"
          ></div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }

      /* Drag & Drop Classes */
      .cdk-drag-preview {
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.3);
        cursor: grabbing;
      }

      .cdk-drag-placeholder {
        opacity: 0.2 !important;
        background: rgba(255, 255, 255, 0.05);
      }

      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      .month-grid {
        /* Dynamic rows handled in template */
      }
    `,
  ],
})
export class AgendaMonthViewComponent implements OnChanges, OnInit {
  private appointmentsService = inject(AppointmentsService);
  private el = inject(ElementRef);
  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);

  private _date = signal<Date>(new Date());
  @Input({ required: true }) set date(val: Date) {
    this._date.set(val);
  }
  get date() {
    return this._date();
  }

  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];
  @Input() selectedStatuses: string[] = [];

  @Output() addAppointment = new EventEmitter<{
    professional: Professional;
    time: string;
    date: Date;
    type?: 'APPOINTMENT' | 'EXCEPTION';
  }>();
  @Output() editAppointment = new EventEmitter<{
    appointment: Appointment;
    newDate?: Date;
  }>();
  @Output() dateChange = new EventEmitter<Date>();
  @Output() dayClick = new EventEmitter<Date>();
  @Output() dayContextMenu = new EventEmitter<{
    day: Date;
    event: MouseEvent;
  }>();

  rawAppointments = signal<Appointment[]>([]);
  professionalsSignal = signal<Professional[]>([]);
  isLoading = signal(false);
  dropPreviewDate = signal<Date | null>(null);
  private wasDragging = false;
  private dragTimeout: any = null;
  private isPreDragging = false;

  today = new Date();

  monthDays = computed(() => {
    const current = this._date();
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });

    // Calculamos el intervalo real de días necesarios para cubrir el mes completo por semanas
    return eachDayOfInterval({ start, end });
  });

  monthRows = computed(() => {
    return this.monthDays().length / 7;
  });

  weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  appointmentsByDay = computed(() => {
    const apps = this.rawAppointments();
    const profs = this.professionalsSignal();
    const profIds = new Set(profs.map((p) => p.id));
    const currentDays = this.monthDays();
    const firstVisibleDay =
      currentDays.length > 0 ? toLocalDateStr(currentDays[0]) : null;

    const draggedApp = this.agendaService.draggedApp();

    const map = new Map<string, Appointment[]>();

    const addToMap = (app: Appointment, dateStr: string) => {
      if (!profIds.has(app.professional.id)) return;
      if (
        this.selectedStatuses.length > 0 &&
        !this.selectedStatuses.includes(app.status)
      )
        return;
      const list = map.get(dateStr) || [];
      if (!list.some((a) => a.id === app.id)) {
        list.push(app);
        map.set(dateStr, list);
      }
    };

    apps.forEach((app) => {
      const dateStr = toLocalDateStr(new Date(app.startTime));
      addToMap(app, dateStr);
    });

    if (draggedApp) {
      const draggedDayStr = toLocalDateStr(new Date(draggedApp.startTime));
      const isVisible = currentDays.some(
        (d) => toLocalDateStr(d) === draggedDayStr,
      );

      if (isVisible) {
        addToMap(draggedApp, draggedDayStr);
      } else if (firstVisibleDay) {
        // RE-HOMING: Mantenemos el turno en el DOM aunque su día no sea visible
        addToMap(draggedApp, firstVisibleDay);
      }
    }

    map.forEach((list) => {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return map;
  });

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['professionals']) {
      this.professionalsSignal.set(this.professionals);
    }
    if (
      changes['date'] ||
      changes['branchId'] ||
      changes['professionals'] ||
      changes['selectedStatuses']
    ) {
      this.loadAppointments();
    }
  }

  loadAppointments(): void {
    if (!this.branchId || !this.date) return;

    this.isLoading.set(true);
    const days = this.monthDays();
    if (days.length === 0) return;

    const start = days[0];
    const end = days[days.length - 1];

    const startDate = startOfLocalDate(start).toISOString();
    const endDate = endOfLocalDate(end).toISOString();

    this.appointmentsService
      .findAll({
        startDate,
        endDate,
        branchId: this.branchId,
        statuses: this.selectedStatuses,
      })
      .subscribe({
        next: (data) => {
          this.rawAppointments.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  isSameDayAsView(otherDate: Date | null): boolean {
    if (!otherDate) return false;
    return this.monthDays().some((d) => isSameDay(d, otherDate!));
  }

  isCurrentMonth(day: Date): boolean {
    return isSameMonth(day, this.date);
  }

  isToday(day: Date): boolean {
    return isToday(day);
  }

  getAppointmentsForDay(day: Date): Appointment[] {
    return this.appointmentsByDay().get(toLocalDateStr(day)) || [];
  }

  onDayClick(day: Date, event: Event): void {
    event.stopPropagation();
    this.dayClick.emit(day);
  }

  getBlocksForDay(day: Date): any[] {
    const blocks: any[] = [];
    const profs = this.professionalsSignal();

    profs.forEach((prof) => {
      (prof.exceptions || []).forEach((ex) => {
        if (ex.type === 'BLOCK') {
          const exDate = parseISODateToLocal(ex.date);
          if (isSameDay(exDate, day)) {
            blocks.push({ ...ex, professional: prof });
          }
        }
      });
    });

    return blocks;
  }

  onAddAppointment(day: Date, event: Event): void {
    event.stopPropagation();
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    if (this.agendaService.isDragging()) return;

    if (this.professionals.length > 0) {
      this.addAppointment.emit({
        professional: this.professionals[0],
        time: '09:00',
        date: day,
        type: 'APPOINTMENT',
      });
    }
  }

  onEditApp(app: Appointment, event: Event): void {
    event.stopPropagation();
    this.editAppointment.emit({ appointment: app });
  }

  // ─── Lógica de Arrastre con Pointer Events ──────────────────────────────

  onPointerDown(app: Appointment, event: PointerEvent): void {
    if (event.button !== 0) return;

    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    this.isPreDragging = true;

    const startX = event.clientX;
    const startY = event.clientY;

    this.dragTimeout = setTimeout(() => {
      this.startDragging(app, startX, startY, target.offsetWidth);
    }, 180); // 180ms delay
  }

  private startDragging(
    app: Appointment,
    x: number,
    y: number,
    width: number,
  ): void {
    this.isPreDragging = false;
    this.agendaService.setDragging(
      true,
      app,
      40,
      width,
      new Date(app.startTime),
    );
    this.agendaService.updateMousePosition(x, y);
    this.wasDragging = false;
    document.body.classList.add('dragging-active');

    // Actualizar preview inmediatamente
    this.updateDropPreviewFromCoords(x, y);
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.agendaService.isDragging()) return;

    this.wasDragging = true;
    this.agendaService.updateMousePosition(event.clientX, event.clientY);
    this.updateDropPreviewFromCoords(event.clientX, event.clientY);
  }

  @HostListener('document:pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (this.dragTimeout) {
      clearTimeout(this.dragTimeout);
      this.dragTimeout = null;
    }

    if (this.isPreDragging) {
      this.isPreDragging = false;
      return;
    }

    if (!this.agendaService.isDragging()) return;

    document.body.classList.remove('dragging-active');
    this.handleDropAction();
  }

  private updateDropPreviewFromCoords(x: number, y: number): void {
    const gridEl = this.el.nativeElement.querySelector('.month-grid');
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;

    if (
      relativeX < 0 ||
      relativeY < 0 ||
      relativeX > rect.width ||
      relativeY > rect.height
    ) {
      this.dropPreviewDate.set(null);
      return;
    }

    const colWidth = rect.width / 7;
    const rows = this.monthRows();
    const rowHeight = rect.height / rows;

    const col = Math.floor(relativeX / colWidth);
    const row = Math.floor(relativeY / rowHeight);

    const index = row * 7 + col;
    const days = this.monthDays();
    if (index >= 0 && index < days.length) {
      const day = days[index];
      if (this.dropPreviewDate() !== day) {
        this.dropPreviewDate.set(day);
      }
    } else {
      this.dropPreviewDate.set(null);
    }
  }

  private handleDropAction(): void {
    const app = this.agendaService.draggedApp();
    const targetDate = this.dropPreviewDate();

    if (app && targetDate) {
      this.editAppointment.emit({ appointment: app, newDate: targetDate });
    }

    this.onDragEnd();
  }

  onDragEnd(): void {
    this.agendaService.stopDragging();
    this.dropPreviewDate.set(null);
    document.body.classList.remove('dragging-active');
  }

  onExceptionClick(exception: any, event: Event): void {
    event.stopPropagation();
    // En vista mensual no editamos excepciones por ahora,
    // pero mantenemos el método para evitar errores de template
  }

  formatTime(isoString: string): string {
    return format(new Date(isoString), 'HH:mm');
  }

  formatDayNumber(day: Date): string {
    const dayNum = format(day, 'd');
    if (dayNum === '1') {
      return format(day, "d 'de' MMM", { locale: es }); //1 de Abr
    }
    return dayNum;
  }

  onAppClick(app: Appointment, event: Event): void {
    event.stopPropagation();
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    this.onEditApp(app, event);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return '#fbbf24';
      case 'CONFIRMED':
        return '#60a5fa';
      case 'COMPLETED':
        return '#c084fc';
      case 'NO_SHOW':
        return '#f87171';
      case 'CANCELLED':
        return '#475569';
      default:
        return '#fbbf24';
    }
  }
}
