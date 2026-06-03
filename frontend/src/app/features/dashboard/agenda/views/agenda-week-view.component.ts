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
  ElementRef,
  OnInit,
  OnDestroy,
  effect,
  HostListener,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfDay,
  isSameDay,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AppointmentsService,
  Appointment,
} from '@services/appointments.service';
import {
  AvailabilityException,
  Professional,
} from '@services/professionals.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { SnackbarService } from '@services/snackbar.service';
import { DialogService } from '@services/dialog.service';
import {
  startOfLocalDate,
  endOfLocalDate,
  createLocalDate,
  toLocalDateStr,
  parseISODateToLocal,
} from '@core/utils/date-utils';
import { AgendaZoomDirective } from '../directives/agenda-zoom.directive';
import { AgendaTimeIndicatorComponent } from '../components/agenda-time-indicator.component';
import { AgendaAppointmentCardComponent } from '../components/agenda-appointment-card.component';
import { AgendaActionSelectorComponent } from '../components/agenda-action-selector.component';
import { AgendaService } from '../agenda.service';
import { SidebarService } from '@core/services/sidebar.service';
import { ModalService } from '@core/services/modal.service';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
  dayIndex: number;
}

@Component({
  selector: 'app-agenda-week-view',
  standalone: true,
  imports: [
    CommonModule,
    AgendaZoomDirective,
    AgendaTimeIndicatorComponent,
    AgendaAppointmentCardComponent,
  ],
  template: `
    <div class="flex-1 relative flex flex-col overflow-hidden no-select">
      <!-- Contenedor con Scroll Real -->
      <div class="flex-1 overflow-auto custom-scrollbar relative" appAgendaZoom>
        <div
          class="grid transition-all duration-300"
          [style.grid-template-columns]="
            (sidebarService.isMobile() ? '45px' : '60px') +
            ' repeat(7, minmax(' +
            (sidebarService.isMobile() ? '80px' : '120px') +
            ', 1fr))'
          "
          [style.grid-template-rows]="
            (sidebarService.isMobile() ? '32px' : '40px') +
            ' repeat(' +
            timeSlots().length +
            ', ' +
            slotHeight() +
            'px)'
          "
        >
          <!-- Esquina Superior Izquierda -->
          <div
            class="sticky top-0 left-0 bg-agenda-header-bg border-b border-r border-agenda-border z-50"
          ></div>

          <!-- Headers de Días (Sticky Top) -->
          @for (day of weekDaysSignal(); track $index; let i = $index) {
            <div
              class="sticky top-0 bg-agenda-header-bg/95 backdrop-blur-md border-b border-r border-agenda-border flex flex-col items-center justify-center z-30 transition-all"
              [style.height.px]="sidebarService.isMobile() ? 32 : 40"
              [style.grid-column]="i + 2"
              [style.grid-row]="1"
            >
              <span
                class="text-[8px] sm:text-[10px] uppercase tracking-tighter sm:tracking-widest text-text-dim leading-none"
                >{{ day | date: 'EEE' : '' : 'es' }}</span
              >
              @if (isToday(day)) {
                <span
                  class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-md shadow-primary/20 mt-0.5"
                  >{{ day | date: 'dd' }}</span
                >
              } @else {
                <span
                  class="text-[10px] sm:text-xs font-bold text-text-main mt-0.5"
                  >{{ day | date: 'dd' }}</span
                >
              }
            </div>
          }

          <!-- Indicadores de Hora Actual (Capa independiente para no mover el grid) -->
          @for (day of weekDaysSignal(); track $index; let i = $index) {
            <app-agenda-time-indicator
              [slotHeight]="slotHeight()"
              [viewDate]="day"
              [fullWidth]="false"
              [style.grid-column]="i + 2"
              [style.grid-row]="'1 / -1'"
            >
            </app-agenda-time-indicator>
          }

          <!-- Filas de Tiempo -->
          @for (slot of timeSlots(); track slot; let rowIndex = $index) {
            <!-- Label de Hora (Sticky Left) -->
            <div
              class="sticky left-0 bg-agenda-header-bg/95 backdrop-blur-md border-r border-b border-agenda-border flex justify-end pr-1 sm:pr-3 items-center text-[9px] sm:text-[11px] font-mono text-agenda-hour-text z-20 transition-all duration-200 select-none zoom-handle"
              [style.grid-row]="rowIndex + 2"
              [style.grid-column]="1"
              [class.!text-primary]="hoveredSlot() === slot"
              [class.!bg-agenda-slot-hover]="hoveredSlot() === slot"
              [class.!font-bold]="hoveredSlot() === slot"
            >
              @if (slot.endsWith(':00')) {
                <span class="transition-all">{{ slot }}</span>
              } @else if (slot.endsWith(':30') && !sidebarService.isMobile()) {
                <span class="opacity-30">-</span>
              }
            </div>

            <!-- Celdas de Fondo -->
            @for (
              day of weekDaysSignal();
              track $index;
              let dayIndex = $index
            ) {
              <div
                class="border-r border-b border-agenda-border relative group cursor-pointer transition-colors"
                [style.grid-row]="rowIndex + 2"
                [style.grid-column]="dayIndex + 2"
                [class.hover:bg-primary/10]="
                  !agendaService.isDragging() && !isSelectingRange()
                "
                (mouseenter)="onCellPointerEnter(slot)"
                (mouseleave)="hoveredSlot.set(null)"
                (pointerdown)="onCellPointerDown(dayIndex, slot, $event)"
                (click)="onCellClick(day, slot)"
              >
                @if (availabilityMap()[dayIndex + '-' + slot]) {
                  <div class="absolute inset-0 bg-available-cell"></div>
                } @else {
                  <div
                    class="absolute inset-0 bg-unavailable-cell"
                    [class.bg-red-500/10]="
                      agendaService.isDragging() || isSelectingRange()
                    "
                  ></div>
                }

                @if (blockedMap()[dayIndex + '-' + slot]) {
                  <div class="absolute inset-0 bg-unavailable-cell"></div>
                }
              </div>
            }
          }

          <!-- Capas de Turnos -->
          @for (day of weekDaysSignal(); track $index; let dayIndex = $index) {
            <div
              class="relative transition-colors duration-300 pointer-events-none"
              [style.grid-column]="dayIndex + 2"
              [style.grid-row]="'2 / span ' + timeSlots().length"
            >
              <!-- Vista previa del resultado del drop -->
              @if (dropPreview(); as preview) {
                @if (preview.dayIndex === dayIndex) {
                  <div
                    class="absolute left-1 right-1 rounded-lg border-2 border-primary/30 bg-primary/5 backdrop-blur-sm pointer-events-none z-0 transition-all duration-150"
                    [style.top.px]="preview.top"
                    [style.height.px]="preview.height"
                  >
                    <div class="w-full h-full flex items-center justify-center">
                      <div
                        class="w-full h-full bg-gradient-to-b from-primary/20 to-transparent opacity-50 animate-pulse"
                      ></div>
                    </div>
                  </div>
                }
              }

              <!-- Vista previa de la selección de rango -->
              @if (selectionPreview(); as preview) {
                @if (preview.dayIndex === dayIndex) {
                  <div
                    class="absolute left-1 right-1 rounded-lg border-2 border-primary bg-primary/20 backdrop-blur-sm pointer-events-none z-20 transition-all duration-75"
                    [style.top.px]="preview.top"
                    [style.height.px]="preview.height"
                  >
                    <div
                      class="w-full h-full flex flex-col items-center justify-center text-white text-[10px] font-bold"
                    >
                      <div
                        class="bg-primary px-2 py-0.5 rounded shadow-lg animate-in fade-in zoom-in duration-200"
                      >
                        NUEVO TURNO
                      </div>
                    </div>
                  </div>
                }
              }

              <!-- Bloqueos / Excepciones (Evidentes - Glass Red) -->
              @for (
                block of blockedBlocksByDay().get(dayIndex) || [];
                track block.id
              ) {
                <div
                  class="absolute left-0 right-0 z-[5] cursor-pointer group/block pointer-events-auto"
                  (click)="onExceptionClick(block.exception, $event)"
                  [style.top.px]="block.top"
                  [style.height.px]="block.height"
                >
                  <div
                    class="w-full h-full backdrop-blur-[2px] bg-agenda-blocked-bg group-hover/block:brightness-110 transition-all bg-stripe-pattern-heavy border-y border-agenda-blocked-border flex items-center justify-center overflow-hidden"
                  >
                    <span
                      class="text-[9px] font-black text-agenda-blocked/60 uppercase tracking-widest rotate-[-12deg] whitespace-nowrap drop-shadow-sm group-hover/block:text-agenda-blocked/80 transition-colors"
                    >
                      {{ block.reason }}
                    </span>
                  </div>
                </div>
              }

              @for (
                app of appointmentsByDay().get(dayIndex) || [];
                track app.id
              ) {
                <div
                  (pointerdown)="onPointerDown(app, $event)"
                  (click)="onAppClick(app, $event)"
                  class="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md sm:rounded-lg p-1 sm:p-2 shadow-xl cursor-pointer group/appt overflow-hidden border border-white/5 z-10 pointer-events-auto touch-none"
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
                  [style.top.px]="app.top"
                  [style.height.px]="app.height"
                  [ngStyle]="{
                    'background-color': app.service.color + '80',
                    color: app.service.color,
                  }"
                >
                  <app-agenda-appointment-card
                    [appointment]="app"
                    [height]="app.height"
                    [showProfessionalBadge]="professionals().length > 1"
                  ></app-agenda-appointment-card>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Modal de Selección de Profesional -->
      @if (pendingSelection(); as pending) {
        <div
          (click)="cancelSelection()"
          class="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            (click)="$event.stopPropagation()"
            class="bg-surface border border-border rounded-2xl p-6 shadow-2xl w-full max-w-sm flex flex-col gap-4 animate-in zoom-in-95 duration-200"
          >
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-bold text-text-main">
                Seleccionar Profesional
              </h3>
              <p class="text-xs text-text-dim">
                {{
                  pending.type === 'MOVE'
                    ? '¿A qué profesional quieres asignar este turno?'
                    : 'Elige un profesional para el nuevo turno'
                }}
              </p>
            </div>

            <div
              class="grid grid-cols-1 gap-2 max-h-[300px] overflow-auto pr-2 custom-scrollbar"
            >
              @for (prof of professionals(); track prof.id) {
                @let isAvailable =
                  isProfessionalAvailableAt(prof, pending.date!, pending.time!);
                @let isOriginal =
                  pending.type === 'MOVE' &&
                  pending.data.originalProfessionalId === prof.id;

                <button
                  (click)="isAvailable ? selectProfessional(prof) : null"
                  [class.opacity-40]="!isAvailable"
                  [class.cursor-not-allowed]="!isAvailable"
                  [class.border-primary]="selectedProfessionalId() === prof.id"
                  [class.bg-primary/10]="selectedProfessionalId() === prof.id"
                  [class.border-primary/40]="
                    isOriginal &&
                    isAvailable &&
                    selectedProfessionalId() !== prof.id
                  "
                  class="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-surface-subtle transition-all text-left group relative overflow-hidden"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg transition-transform"
                      [style.background-color]="prof.color || '#6366f1'"
                    >
                      {{ prof.firstName[0] }}{{ prof.lastName[0] }}
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-text-main"
                          >{{ prof.firstName }} {{ prof.lastName }}</span
                        >
                        @if (isOriginal && isAvailable) {
                          <span
                            class="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter"
                            >Original</span
                          >
                        }
                      </div>
                      <span
                        class="text-[10px] text-text-dim uppercase tracking-wider"
                      >
                        {{ isAvailable ? 'Disponible' : 'No Disponible' }}
                      </span>
                    </div>
                  </div>

                  @if (selectedProfessionalId() === prof.id) {
                    <div class="text-primary text-lg">✓</div>
                  } @else if (isAvailable && isOriginal) {
                    <div class="text-primary text-lg opacity-40">✨</div>
                  }
                </button>
              }
            </div>

            <div class="flex gap-3 mt-6">
              <button
                (click)="cancelSelection()"
                class="flex-1 py-3 rounded-xl border border-border hover:bg-surface-subtle text-xs font-bold text-text-dim uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                (click)="confirmSelection()"
                [disabled]="!selectedProfessionalId()"
                [class.opacity-50]="!selectedProfessionalId()"
                [class.cursor-not-allowed]="!selectedProfessionalId()"
                class="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
              >
                Confirmar
              </button>
            </div>
          </div>
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
        background: var(--color-agenda-border);
        border-radius: 10px;
      }

      .bg-stripe-pattern {
        background-image: linear-gradient(
          45deg,
          var(--color-agenda-blocked-stripe) 25%,
          transparent 25%,
          transparent 50%,
          var(--color-agenda-blocked-stripe) 50%,
          var(--color-agenda-blocked-stripe) 75%,
          transparent 75%,
          transparent
        );
        background-size: 12px 12px;
      }

      .bg-unavailable-cell {
        background-color: var(--color-agenda-unavailable);
        background-image: linear-gradient(
          45deg,
          var(--color-agenda-blocked-stripe) 25%,
          transparent 25%,
          transparent 50%,
          var(--color-agenda-blocked-stripe) 50%,
          var(--color-agenda-blocked-stripe) 75%,
          transparent 75%,
          transparent
        );
        background-size: 8px 8px;
      }

      .bg-available-cell {
        background-color: var(--color-agenda-available);
      }

      .cdk-drag-preview {
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.3);
        cursor: grabbing;
      }

      .cdk-drag-placeholder {
        opacity: 0 !important;
      }

      .cdk-drag-animating {
        transition: none !important;
      }

      .group\\/appt:hover {
        filter: brightness(1.2);
        z-index: 30;
      }

      .group\\/appt {
        transition:
          top 0.2s cubic-bezier(0, 0, 0.2, 1),
          left 0.2s cubic-bezier(0, 0, 0.2, 1),
          filter 0.2s ease,
          box-shadow 0.2s ease,
          background-color 0.2s ease !important;
      }

      .cdk-drag-dragging {
        transition: none !important;
        z-index: 1000 !important;
        opacity: 0.9;
      }
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      .dragging-active {
        cursor: grabbing !important;
        user-select: none;
      }
    `,
  ],
})
export class AgendaWeekViewComponent implements OnChanges, OnInit, OnDestroy {
  private appointmentsService = inject(AppointmentsService);
  private userConfig = inject(UserConfigurationService);
  private snackbarService = inject(SnackbarService);
  private dialogService = inject(DialogService);
  private el = inject(ElementRef);
  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);
  private modal = inject(ModalService);

  date = input.required<Date>();
  branchId = input.required<string | null>();
  professionals = input.required<Professional[]>();
  selectedStatuses = input<string[]>([]);

  @Output() addAppointment = new EventEmitter<{
    professional: Professional;
    time: string;
    date?: Date;
    endTime?: string;
    x?: number;
    y?: number;
    type?: 'APPOINTMENT' | 'EXCEPTION';
  }>();
  @Output() editAppointment = new EventEmitter<{
    appointment: Appointment;
    newDate?: Date;
  }>();
  @Output() editException = new EventEmitter<AvailabilityException>();
  @Output() dateChange = new EventEmitter<Date>();

  rawAppointments = signal<Appointment[]>([]);
  todayDate = new Date();

  private zoomLevel = this.userConfig.agendaZoom;
  private startHour = this.userConfig.agendaStartHour;
  private endHour = this.userConfig.agendaEndHour;

  constructor() {}

  weekDaysSignal = signal<Date[]>([]);

  timeSlots = computed(() => {
    const start = this.startHour();
    const end = this.endHour();
    const slots: string[] = [];
    for (let hour = start; hour < end; hour++) {
      for (let min of ['00', '15', '30', '45']) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min}`);
      }
    }
    return slots;
  });

  containerHeight = signal(0);
  isLoading = signal(false);
  hoveredSlot = signal<string | null>(null);
  draggedApp = signal<AppointmentUI | null>(null);
  dropPreview = signal<{
    dayIndex: number;
    top: number;
    height: number;
  } | null>(null);

  // Estados para selección de rango
  isSelectingRange = signal(false);
  selectionStartSlot = signal<string | null>(null);
  selectionEndSlot = signal<string | null>(null);
  selectionDayIndex = signal<number | null>(null);

  selectionPreview = computed(() => {
    if (
      !this.selectionStartSlot() ||
      !this.selectionEndSlot() ||
      this.selectionDayIndex() === null
    )
      return null;

    const slots = this.timeSlots();
    const startIndex = slots.indexOf(this.selectionStartSlot()!);
    const endIndex = slots.indexOf(this.selectionEndSlot()!);

    if (startIndex === -1 || endIndex === -1) return null;

    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);

    const h = this.slotHeight();
    return {
      dayIndex: this.selectionDayIndex()!,
      top: start * h,
      height: (end - start + 1) * h,
    };
  });

  pendingSelection = signal<{
    type: 'ADD' | 'MOVE';
    data: any;
    date?: Date;
    time?: string;
    actionType?: 'APPOINTMENT' | 'EXCEPTION';
  } | null>(null);

  selectedProfessionalId = signal<string | null>(null);

  private originalDate: Date | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private dragCancelled = false;
  private wasDragging = false;
  private dragTimeout: any = null;
  private isPreDragging = false;

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: any) {
    if (this.pendingSelection()) {
      this.cancelSelection();
    } else if (this.isSelectingRange()) {
      this.onRangeSelectionEnd();
    } else if (this.agendaService.isDragging()) {
      this.dragCancelled = true;

      if (
        this.originalDate &&
        this.originalDate.getTime() !== this.weekDaysSignal()[0]?.getTime()
      ) {
        this.dateChange.emit(this.originalDate);
      }

      this.onDragEnd();
    }
  }

  slotHeight = computed(() => {
    const h = this.containerHeight();
    const slots = this.timeSlots().length;
    if (h === 0 || slots === 0) return 25;

    // Header is 40px
    const availableHeight = h - 40;
    return (availableHeight / slots) * this.zoomLevel();
  });

  selectedProfessional = computed(() => {
    return this.professionals()[0] || null;
  });

  appointments = computed(() => {
    const height = this.slotHeight();
    const slots = this.timeSlots();
    const days = this.weekDaysSignal();
    const profs = this.professionals();

    if (profs.length === 0) return [];

    const profIds = new Set(profs.map((p) => p.id));

    return this.rawAppointments()
      .filter(
        (app) =>
          profIds.has(app.professional.id) &&
          (this.selectedStatuses().length === 0 ||
            this.selectedStatuses().includes(app.status)),
      )
      .map((app) => {
        const dragging = this.draggedApp();
        if (dragging && dragging.id === app.id) {
          return dragging;
        }

        const appDate = new Date(app.startTime);
        const duration =
          (new Date(app.endTime).getTime() - appDate.getTime()) / (1000 * 60);

        const dayStr = toLocalDateStr(appDate);
        const dayIndex = days.findIndex((d) => toLocalDateStr(d) === dayStr);

        const startHourVal = this.startHour();
        const appHour = appDate.getHours();
        const appMin = appDate.getMinutes();
        const minutesOffset = appHour * 60 + appMin - startHourVal * 60;

        return {
          ...app,
          top: (minutesOffset * height) / 15,
          height: (duration * height) / 15,
          dayIndex: dayIndex,
        } as AppointmentUI;
      });
  });

  appointmentsByDay = computed(() => {
    const map = new Map<number, AppointmentUI[]>();
    this.appointments().forEach((app) => {
      const list = map.get(app.dayIndex) || [];
      list.push(app);
      map.set(app.dayIndex, list);
    });
    return map;
  });

  blockedBlocksByDay = computed(() => {
    const map = new Map<number, any[]>();
    const height = this.slotHeight();
    const slots = this.timeSlots();
    const days = this.weekDaysSignal();
    const profs = this.professionals();

    // Solo mostramos bloques si hay un solo profesional seleccionado para no saturar
    if (profs.length !== 1) return map;

    const prof = profs[0];
    const exceptions = prof.exceptions || [];

    days.forEach((day, dayIndex) => {
      const dayBlocks: any[] = [];
      exceptions.forEach((ex) => {
        const exceptionDate = parseISODateToLocal(ex.date);

        if (isSameDay(exceptionDate, day) && ex.type === 'BLOCK') {
          const startIndex = slots.findIndex((s) => s === ex.startTime);

          if (startIndex !== -1 && ex.startTime && ex.endTime) {
            const startParts = ex.startTime.split(':').map(Number);
            const endParts = ex.endTime.split(':').map(Number);
            const duration =
              endParts[0] * 60 +
              endParts[1] -
              (startParts[0] * 60 + startParts[1]);

            dayBlocks.push({
              id: ex.id,
              top: startIndex * height,
              height: (duration * height) / 15,
              reason: ex.reason || 'Bloqueado',
              exception: ex,
            });
          }
        }
      });
      map.set(dayIndex, dayBlocks);
    });

    return map;
  });

  // Maps para disponibilidad
  availabilityMap = signal<Record<string, boolean>>({});
  blockedMap = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.containerHeight.set(entry.contentRect.height);
      }
    });
    this.resizeObserver.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date']) {
      const start = startOfWeek(this.date(), { weekStartsOn: 1 });
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      this.weekDaysSignal.set(days);
    }
    if (
      changes['date'] ||
      changes['branchId'] ||
      changes['professionals'] ||
      changes['selectedStatuses']
    ) {
      this.loadAppointments();
      this.computeGridStatus();
    }
  }

  isSameDayAsView(otherDate: Date | null): boolean {
    if (!otherDate) return false;
    return this.weekDaysSignal().some((d) => isSameDay(d, otherDate!));
  }

  isToday(day: Date): boolean {
    return isToday(day);
  }

  computeGridStatus(): void {
    const profs = this.professionals();
    if (profs.length === 0) return;

    const avail: Record<string, boolean> = {};
    const block: Record<string, boolean> = {};

    this.weekDaysSignal().forEach((day, dayIndex) => {
      this.timeSlots().forEach((slot) => {
        const key = `${dayIndex}-${slot}`;
        avail[key] = profs.some((p) =>
          this.isProfessionalAvailableAt(p, day, slot),
        );
        block[key] =
          profs.length === 1
            ? this.isProfessionalBlockedAt(profs[0], day, slot)
            : false;
      });
    });

    this.availabilityMap.set(avail);
    this.blockedMap.set(block);
  }

  loadAppointments(): void {
    if (!this.branchId()) return;

    this.isLoading.set(true);
    const start = this.weekDaysSignal()[0];
    const end = this.weekDaysSignal()[6];

    const startDate = startOfLocalDate(start).toISOString();
    const endDate = endOfLocalDate(end).toISOString();

    this.appointmentsService
      .findAll({
        startDate,
        endDate,
        branchId: this.branchId()!,
        statuses: this.selectedStatuses(),
      })
      .subscribe({
        next: (data) => {
          setTimeout(() => {
            const currentDragged = this.draggedApp();
            let finalData = [...data];
            if (
              currentDragged &&
              !finalData.find((a) => a.id === currentDragged.id)
            ) {
              finalData.unshift(currentDragged);
            }
            this.rawAppointments.set(finalData);
            this.isLoading.set(false);
          }, 0);
        },
        error: () => this.isLoading.set(false),
      });
  }

  isProfessionalAvailableAt(
    prof: Professional,
    date: Date,
    slot: string,
  ): boolean {
    let dayOfWeek = date.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7; // Ajuste para nuestro estándar 1=Lun, 7=Dom

    const isOut = prof.exceptions?.some((ex) => {
      const start = startOfLocalDate(parseISODateToLocal(ex.date));
      const end = ex.endDate
        ? startOfLocalDate(parseISODateToLocal(ex.endDate))
        : start;
      const current = startOfDay(date);
      return (
        current >= start &&
        current <= end &&
        (ex.type === 'HOLIDAY' || ex.type === 'LEAVE')
      );
    });
    if (isOut) return false;

    const currentBranchId = this.branchId();
    const blocks =
      prof.availability?.filter(
        (a) =>
          a.dayOfWeek === dayOfWeek &&
          (!currentBranchId || a.branchId === currentBranchId),
      ) || [];
    return blocks.some((b) => slot >= b.startTime && slot < b.endTime);
  }

  isProfessionalBlockedAt(
    prof: Professional,
    date: Date,
    slot: string,
  ): boolean {
    const current = startOfDay(date);
    return (prof.exceptions || []).some((ex) => {
      const start = startOfLocalDate(parseISODateToLocal(ex.date));
      const end = ex.endDate
        ? startOfLocalDate(parseISODateToLocal(ex.endDate))
        : start;
      return (
        current >= start &&
        current <= end &&
        ex.type === 'BLOCK' &&
        ex.startTime &&
        ex.endTime &&
        slot >= ex.startTime &&
        slot < ex.endTime
      );
    });
  }

  // ─── Lógica de Arrastre con Pointer Events ──────────────────────────────

  onPointerDown(app: AppointmentUI, event: PointerEvent): void {
    // Solo clic izquierdo
    if (event.button !== 0) return;

    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    this.isPreDragging = true;

    // Almacenamos los datos para cuando expire el timeout
    const startX = event.clientX;
    const startY = event.clientY;

    this.dragTimeout = setTimeout(() => {
      this.startDragging(app, startX, startY, target.offsetWidth);
    }, 180); // 180ms delay para distinguir click de drag
  }

  private startDragging(
    app: AppointmentUI,
    x: number,
    y: number,
    width: number,
  ): void {
    this.isPreDragging = false;
    this.agendaService.setDragging(
      true,
      app,
      app.height,
      width,
      new Date(app.startTime),
    );
    this.agendaService.updateMousePosition(x, y);
    this.draggedApp.set(app);
    this.originalDate = new Date(this.weekDaysSignal()[0]);
    this.dragCancelled = false;
    this.wasDragging = false;

    document.body.classList.add('dragging-active');

    // Actualizar preview inmediatamente
    this.updateDropPreviewFromCoords(x, y);
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (this.isSelectingRange()) {
      this.updateRangeSelectionFromCoords(event.clientX, event.clientY);
      return;
    }
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

    if (this.isSelectingRange()) {
      this.handleRangeSelectionDrop(event);
      return;
    }

    if (!this.agendaService.isDragging()) return;

    document.body.classList.remove('dragging-active');
    this.handleDropAction();
  }

  private updateDropPreviewFromCoords(x: number, y: number): void {
    const gridEl = this.el.nativeElement.querySelector('.grid');
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const isMobile = this.sidebarService.isMobile();
    const timeColWidth = isMobile ? 45 : 60;
    const headerHeight = isMobile ? 32 : 40;

    // Posición relativa al inicio del contenido del grid (incluyendo scroll)
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;

    // rect.width a veces puede ser solo el ancho visible si el elemento está contenido,
    // usamos scrollWidth para asegurar el ancho total de las columnas
    const totalWidth = gridEl.scrollWidth;

    if (
      relativeY < headerHeight ||
      relativeX < timeColWidth ||
      relativeX > totalWidth ||
      relativeY > rect.height
    ) {
      this.dropPreview.set(null);
      return;
    }

    const columnWidth = (totalWidth - timeColWidth) / 7;
    const dayIndex = Math.floor((relativeX - timeColWidth) / columnWidth);

    const h = this.slotHeight();
    const rowIndex = Math.floor((relativeY - headerHeight) / h);

    if (
      dayIndex >= 0 &&
      dayIndex < 7 &&
      rowIndex >= 0 &&
      rowIndex < this.timeSlots().length
    ) {
      const newPreview = {
        dayIndex,
        top: rowIndex * h,
        height: this.draggedApp()?.height || 0,
      };

      if (JSON.stringify(this.dropPreview()) !== JSON.stringify(newPreview)) {
        this.dropPreview.set(newPreview);
      }
    } else {
      this.dropPreview.set(null);
    }
  }

  private async handleDropAction(): Promise<void> {
    if (this.dragCancelled) {
      this.dragCancelled = false;
      this.onDragEnd();
      return;
    }

    const app = this.agendaService.draggedApp();
    const preview = this.dropPreview();

    if (!app || !preview) {
      if (app) this.handleFailedDrop(app);
      this.onDragEnd();
      return;
    }

    const targetDayIndex = preview.dayIndex;
    const newTimeStr =
      this.timeSlots()[Math.round(preview.top / this.slotHeight())];
    const newDate = this.weekDaysSignal()[targetDayIndex];

    if (!this.availabilityMap()[`${targetDayIndex}-${newTimeStr}`]) {
      const confirmed = await this.dialogService.confirm({
        title: 'Horario no disponible',
        message:
          'El profesional no está disponible en este horario. ¿Deseas agendar el turno de todas formas?',
        confirmText: 'Agendar de todas formas',
        cancelText: 'Cancelar',
        type: 'warning',
      });

      if (!confirmed) {
        this.revertDrop(app);
        this.onDragEnd();
        return;
      }
    }

    const originalDuration =
      new Date(app.endTime).getTime() - new Date(app.startTime).getTime();
    const newStartTime = createLocalDate(toLocalDateStr(newDate), newTimeStr);
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    const moveData = {
      app,
      newStartTime,
      newEndTime,
    };

    if (this.professionals().length > 1) {
      this.pendingSelection.set({
        type: 'MOVE',
        data: { ...moveData, originalProfessionalId: app.professional.id },
        date: newDate,
        time: newTimeStr,
      });

      const originalProf = this.professionals().find(
        (p) => p.id === app.professional.id,
      );
      if (
        originalProf &&
        this.isProfessionalAvailableAt(originalProf, newDate, newTimeStr)
      ) {
        this.selectedProfessionalId.set(originalProf.id);
      }
    } else {
      this.executeMove(app, newStartTime, newEndTime, this.professionals()[0]);
    }

    this.onDragEnd();
  }

  onCellClick(day: Date, time: string): void {
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    this.onAdd(day, time);
  }

  onDragEnd(): void {
    this.agendaService.stopDragging();
    this.draggedApp.set(null);
    this.dropPreview.set(null);
    this.originalDate = null;
    document.body.classList.remove('dragging-active');
  }

  executeMove(
    app: Appointment,
    newStartTime: Date,
    newEndTime: Date,
    targetProf: Professional,
  ): void {
    this.rawAppointments.update((apps) =>
      apps.map((a) =>
        a.id === app.id
          ? {
              ...a,
              startTime: newStartTime.toISOString(),
              endTime: newEndTime.toISOString(),
              professional: {
                id: targetProf.id,
                firstName: targetProf.firstName,
                lastName: targetProf.lastName,
                color: targetProf.color || '#6366f1',
              },
            }
          : a,
      ),
    );

    this.refreshUI(app);

    this.appointmentsService
      .update(app.id, {
        startTime: newStartTime.toISOString(),
        professionalId: targetProf.id,
      })
      .subscribe({
        error: () => this.loadAppointments(),
      });
  }

  selectProfessional(prof: Professional): void {
    this.selectedProfessionalId.set(prof.id);
  }

  confirmSelection(): void {
    const pending = this.pendingSelection();
    const profId = this.selectedProfessionalId();
    if (!pending || !profId) return;

    const prof = this.professionals().find((p) => p.id === profId);
    if (!prof) return;

    if (pending.type === 'MOVE') {
      const { app, newStartTime, newEndTime } = pending.data;
      this.executeMove(app, newStartTime, newEndTime, prof);
    } else if (pending.type === 'ADD') {
      this.addAppointment.emit({
        professional: prof,
        time: pending.time!,
        date: pending.date,
        endTime: pending.data.endTime,
        x: pending.data.x,
        y: pending.data.y,
        type: pending.actionType,
      });
    }

    this.pendingSelection.set(null);
    this.selectedProfessionalId.set(null);
  }

  cancelSelection(): void {
    const pending = this.pendingSelection();
    if (pending && pending.type === 'MOVE') {
      this.refreshUI(pending.data.app);
    }

    this.pendingSelection.set(null);
    this.selectedProfessionalId.set(null);
    this.loadAppointments();
  }

  private revertDrop(app: Appointment): void {
    if (
      this.originalDate &&
      this.originalDate.getTime() !== this.weekDaysSignal()[0]?.getTime()
    ) {
      this.dateChange.emit(this.originalDate);
    }
    this.refreshUI(app);
  }

  private handleFailedDrop(app: Appointment): void {
    this.snackbarService.warning(
      'El profesional no está disponible en este horario.',
    );
    this.revertDrop(app);
  }

  private refreshUI(app: Appointment): void {
    const current = this.rawAppointments();
    this.rawAppointments.set(current.filter((a) => a.id !== app.id));
    setTimeout(() => this.rawAppointments.set(current), 0);
  }

  onExceptionClick(exception: AvailabilityException, event: MouseEvent): void {
    event.stopPropagation();
    this.editException.emit(exception);
  }

  onAppClick(app: Appointment, event: Event): void {
    event.stopPropagation();
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    this.editAppointment.emit({ appointment: app });
  }

  onAdd(
    day: Date,
    time: string,
    endTime?: string,
    x?: number,
    y?: number,
  ): void {
    const isMobile = this.sidebarService.isMobile();

    if (isMobile) {
      const profs = this.professionals();
      if (profs.length === 1) {
        this.addAppointment.emit({
          professional: profs[0],
          time,
          date: day,
          endTime,
        });
      } else {
        this.pendingSelection.set({
          type: 'ADD',
          data: { endTime },
          date: day,
          time,
        });
      }
      return;
    }

    const dialogRef = this.modal.open(AgendaActionSelectorComponent, {
      width: '200px',
      data: { x, y },
      hasBackdrop: false,
      panelClass: 'modal-panel-dropdown',
    });

    dialogRef.closed.subscribe((action) => {
      if (!action) {
        this.onRangeSelectionEnd();
        return;
      }

      const profs = this.professionals();
      if (profs.length === 1) {
        this.addAppointment.emit({
          professional: profs[0],
          time,
          date: day,
          endTime,
          x,
          y,
          type: action,
        });
        this.onRangeSelectionEnd();
      } else if (profs.length > 1) {
        this.pendingSelection.set({
          type: 'ADD',
          actionType: action,
          data: { endTime, x, y },
          date: day,
          time: time,
        });
        // No cerramos el rango aún, se cerrará en confirmSelection o cancelSelection
      }
    });
  }

  // ─── Lógica de Selección de Rango ──────────────────────────────────────

  onCellPointerDown(dayIndex: number, slot: string, event: PointerEvent): void {
    if (
      event.button !== 0 ||
      this.sidebarService.isMobile() ||
      this.agendaService.isDragging()
    )
      return;

    this.isSelectingRange.set(true);
    this.selectionStartSlot.set(slot);
    this.selectionEndSlot.set(slot);
    this.selectionDayIndex.set(dayIndex);

    document.body.classList.add('dragging-active');
  }

  onCellPointerEnter(slot: string): void {
    this.hoveredSlot.set(slot);
    // Ya no actualizamos el rango aquí, lo hacemos por coordenadas
  }

  private updateRangeSelectionFromCoords(x: number, y: number): void {
    const gridEl = this.el.nativeElement.querySelector('.grid');
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const isMobile = this.sidebarService.isMobile();
    const headerHeight = isMobile ? 32 : 40;

    const relativeY = y - rect.top;

    if (relativeY < headerHeight || relativeY > rect.height) return;

    const h = this.slotHeight();
    const rowIndex = Math.floor((relativeY - headerHeight) / h);

    if (rowIndex >= 0 && rowIndex < this.timeSlots().length) {
      const slot = this.timeSlots()[rowIndex];
      if (this.selectionEndSlot() !== slot) {
        this.selectionEndSlot.set(slot);
      }
    }
  }

  private handleRangeSelectionDrop(event: PointerEvent): void {
    const startSlot = this.selectionStartSlot();
    const endSlot = this.selectionEndSlot();
    const dayIndex = this.selectionDayIndex();

    if (!startSlot || !endSlot || dayIndex === null) {
      this.onRangeSelectionEnd();
      return;
    }

    // Bloqueamos la selección para que no se mueva mientras elegimos en el menú
    this.isSelectingRange.set(false);

    const slots = this.timeSlots();
    const startIndex = slots.indexOf(startSlot);
    const endIndex = slots.indexOf(endSlot);

    if (startIndex === -1 || endIndex === -1) {
      this.onRangeSelectionEnd();
      return;
    }

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    const finalStartSlot = slots[minIndex];

    // Calcular el endTime basado en el último slot + 15 min
    let endTimeStr = '';
    if (maxIndex + 1 < slots.length) {
      endTimeStr = slots[maxIndex + 1];
    } else {
      const [h, m] = slots[maxIndex].split(':').map(Number);
      const totalMins = h * 60 + m + 15;
      const endH = Math.floor(totalMins / 60);
      const endM = totalMins % 60;
      endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    const day = this.weekDaysSignal()[dayIndex];

    // Reutilizamos onAdd para manejar la selección de profesional si es necesario
    this.onAdd(day, finalStartSlot, endTimeStr, event.clientX, event.clientY);

    this.wasDragging = true;
    // No limpiamos inmediatamente
  }

  clearSelection(): void {
    this.onRangeSelectionEnd();
  }

  onRangeSelectionEnd(): void {
    this.isSelectingRange.set(false);
    this.selectionStartSlot.set(null);
    this.selectionEndSlot.set(null);
    this.selectionDayIndex.set(null);
    document.body.classList.remove('dragging-active');
  }
}
