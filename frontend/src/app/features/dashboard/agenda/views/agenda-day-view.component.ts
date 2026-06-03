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
import { format, startOfDay, isSameDay } from 'date-fns';
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
  parseISODateToLocal,
} from '@core/utils/date-utils';
import { AgendaZoomDirective } from '../directives/agenda-zoom.directive';
import { AgendaTimeIndicatorComponent } from '../components/agenda-time-indicator.component';
import { AgendaAppointmentCardComponent } from '../components/agenda-appointment-card.component';
import { AgendaService } from '../agenda.service';
import { SidebarService } from '@core/services/sidebar.service';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
}

@Component({
  selector: 'app-agenda-day-view',
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
      <div class="h-full overflow-auto custom-scrollbar relative" appAgendaZoom>
        <div
          class="grid transition-all duration-300"
          [style.grid-template-columns]="
            (sidebarService.isMobile() ? '45px' : '60px') +
            ' repeat(' +
            professionals().length +
            ', minmax(' +
            (sidebarService.isMobile() ? '140px' : '250px') +
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
            [style.grid-column]="1"
            [style.grid-row]="1"
          ></div>

          <!-- Indicador de Hora Actual -->
          <app-agenda-time-indicator
            [slotHeight]="slotHeight()"
            [viewDate]="date()"
            [style.grid-column]="'1 / -1'"
            [style.grid-row]="'1 / -1'"
          ></app-agenda-time-indicator>

          <!-- Headers de Profesionales (Sticky Top) -->
          @for (prof of professionals(); track prof.id; let i = $index) {
            <div
              class="sticky top-0 bg-agenda-header-bg/95 backdrop-blur-md border-b border-r border-agenda-border flex items-center justify-center gap-2 sm:gap-3 z-30 transition-all"
              [style.height.px]="sidebarService.isMobile() ? 32 : 40"
              [style.grid-column]="i + 2"
              [style.grid-row]="1"
            >
              <div
                class="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold text-[9px] sm:text-[10px]"
                [style.background-color]="prof.color + '30'"
                [style.color]="prof.color"
              >
                {{ prof.firstName[0] }}{{ prof.lastName[0] }}
              </div>
              <span
                class="text-[10px] sm:text-xs font-bold text-text-main truncate max-w-[80px] sm:max-w-none"
                >{{ prof.firstName }}</span
              >
            </div>
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
                <span
                  class="transition-colors"
                  [class.text-primary]="hoveredSlot() === slot"
                  [class.font-bold]="
                    !slot.endsWith(':00') || hoveredSlot() === slot
                  "
                  >{{ slot }}</span
                >
              } @else if (slot.endsWith(':30')) {
                <span
                  class="opacity-30"
                  [class.opacity-100]="hoveredSlot() === slot"
                  >-</span
                >
              } @else {
                <span
                  class="opacity-0 transition-all"
                  [class.opacity-40]="hoveredSlot() === slot"
                  >·</span
                >
              }
            </div>

            <!-- Celdas de Fondo Estáticas -->
            @for (
              prof of professionals();
              track prof.id;
              let colIndex = $index
            ) {
              <div
                class="border-r border-b border-agenda-border relative group cursor-pointer transition-colors"
                [style.grid-row]="rowIndex + 2"
                [style.grid-column]="colIndex + 2"
                [class.hover:bg-primary/10]="
                  !agendaService.isDragging() && !isSelectingRange()
                "
                (mouseenter)="onCellPointerEnter(slot)"
                (mouseleave)="onCellLeave()"
                (pointerdown)="onCellPointerDown(prof, slot, $event)"
                (click)="onCellClick(prof, slot)"
              >
                @if (availabilityMap()[prof.id + '-' + slot]) {
                  <div class="absolute inset-0 bg-available-cell"></div>
                } @else {
                  <div
                    class="absolute inset-0 bg-unavailable-cell"
                    [class.bg-red-500/10]="
                      agendaService.isDragging() || isSelectingRange()
                    "
                  ></div>
                }

                @if (blockedMap()[prof.id + '-' + slot]) {
                  <div
                    class="absolute inset-0 bg-agenda-unavailable bg-stripe-pattern"
                  ></div>
                }
              </div>
            }
          }

          <!-- Capas de Turnos -->
          @for (prof of professionals(); track prof.id; let colIndex = $index) {
            <div
              class="relative transition-colors duration-300 pointer-events-none"
              [style.grid-column]="colIndex + 2"
              [style.grid-row]="'2 / span ' + timeSlots().length"
            >
              <!-- Vista previa del resultado del drop -->
              @if (dropPreview(); as preview) {
                @if (preview.professionalId === prof.id) {
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
                @if (preview.professionalId === prof.id) {
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
                block of blockedBlocksByProfessional().get(prof.id) || [];
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
                app of appointmentsByProfessional().get(prof.id) || [];
                track app.id
              ) {
                <div
                  (pointerdown)="onPointerDown(app, $event)"
                  (click)="onAppClick(app, $event)"
                  class="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md sm:rounded-lg p-1 sm:p-2 shadow-xl cursor-pointer group/appt overflow-hidden z-10 pointer-events-auto touch-none"
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
                    [showProfessionalBadge]="false"
                  ></app-agenda-appointment-card>
                </div>
              }
            </div>
          }
        </div>
      </div>
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
export class AgendaDayViewComponent implements OnChanges, OnInit, OnDestroy {
  private appointmentsService = inject(AppointmentsService);
  private userConfig = inject(UserConfigurationService);
  private snackbarService = inject(SnackbarService);
  private dialogService = inject(DialogService);
  private el = inject(ElementRef);
  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);

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

  rawAppointments = signal<Appointment[]>([]);
  private zoomLevel = this.userConfig.agendaZoom;
  private startHour = this.userConfig.agendaStartHour;
  private endHour = this.userConfig.agendaEndHour;

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

  formattedDate = computed(() => {
    return format(this.date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  });

  containerHeight = signal(0);
  isLoading = signal(false);
  hoveredSlot = signal<string | null>(null);
  draggedApp = signal<AppointmentUI | null>(null);
  dropPreview = signal<{
    professionalId: string;
    top: number;
    height: number;
  } | null>(null);

  // Estados para selección de rango
  isSelectingRange = signal(false);
  selectionStartSlot = signal<string | null>(null);
  selectionEndSlot = signal<string | null>(null);
  selectionProfessional = signal<Professional | null>(null);

  selectionPreview = computed(() => {
    if (
      !this.selectionStartSlot() ||
      !this.selectionEndSlot() ||
      !this.selectionProfessional()
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
      professionalId: this.selectionProfessional()!.id,
      top: start * h,
      height: (end - start + 1) * h,
    };
  });

  private resizeObserver: ResizeObserver | null = null;

  slotHeight = computed(() => {
    const h = this.containerHeight();
    const slots = this.timeSlots().length;
    if (h === 0 || slots === 0) return 25;

    // Header is 40px
    const availableHeight = h - 40;
    return (availableHeight / slots) * this.zoomLevel();
  });

  appointments = computed(() => {
    const height = this.slotHeight();
    const slots = this.timeSlots();

    const filteredRaw = this.rawAppointments().filter(
      (app) =>
        this.selectedStatuses().length === 0 ||
        this.selectedStatuses().includes(app.status),
    );

    return filteredRaw.map((app) => {
      const start = new Date(app.startTime);
      const end = new Date(app.endTime);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);

      const startHourVal = this.startHour();
      const appHour = start.getHours();
      const appMin = start.getMinutes();
      const minutesOffset = appHour * 60 + appMin - startHourVal * 60;

      return {
        ...app,
        top: (minutesOffset * height) / 15,
        height: (duration * height) / 15,
      } as AppointmentUI;
    });
  });

  private originalDate: Date | null = null;
  @Output() dateChange = new EventEmitter<Date>();
  private dragCancelled = false;
  private wasDragging = false;
  private dragTimeout: any = null;
  private isPreDragging = false;

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: any) {
    if (this.isSelectingRange()) {
      this.onRangeSelectionEnd();
      return;
    }
    if (this.agendaService.isDragging()) {
      this.dragCancelled = true;

      if (
        this.originalDate &&
        this.originalDate.getTime() !== this.date().getTime()
      ) {
        this.dateChange.emit(this.originalDate);
      }

      this.onDragEnd();
    }
  }

  // Maps para optimización
  availabilityMap = signal<Record<string, boolean>>({});
  blockedMap = signal<Record<string, boolean>>({});

  appointmentsByProfessional = computed(() => {
    const map = new Map<string, AppointmentUI[]>();
    this.appointments().forEach((app) => {
      const list = map.get(app.professional.id) || [];
      list.push(app);
      map.set(app.professional.id, list);
    });
    return map;
  });

  blockedBlocksByProfessional = computed(() => {
    const map = new Map<string, any[]>();
    const height = this.slotHeight();
    const slots = this.timeSlots();
    const viewDate = this.date();

    this.professionals().forEach((prof) => {
      const blocks: any[] = [];
      const exceptions = prof.exceptions || [];

      exceptions.forEach((ex) => {
        const exceptionDate = parseISODateToLocal(ex.date);

        // Verificar si la excepción es para el día actual y es un bloqueo
        if (isSameDay(exceptionDate, viewDate) && ex.type === 'BLOCK') {
          const startIndex = slots.findIndex((s) => s === ex.startTime);

          if (startIndex !== -1 && ex.startTime && ex.endTime) {
            const startParts = ex.startTime.split(':').map(Number);
            const endParts = ex.endTime.split(':').map(Number);
            const duration =
              endParts[0] * 60 +
              endParts[1] -
              (startParts[0] * 60 + startParts[1]);

            blocks.push({
              id: ex.id,
              top: startIndex * height,
              height: (duration * height) / 15,
              reason: ex.reason || 'Bloqueado',
              exception: ex,
            });
          }
        }
      });
      map.set(prof.id, blocks);
    });
    return map;
  });

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

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
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
    return isSameDay(otherDate, this.date());
  }

  computeGridStatus(): void {
    const avail: Record<string, boolean> = {};
    const block: Record<string, boolean> = {};
    const isSingleProf = this.professionals().length === 1;

    this.professionals().forEach((prof) => {
      this.timeSlots().forEach((slot) => {
        const key = `${prof.id}-${slot}`;
        avail[key] = this.isProfessionalAvailableAt(prof, slot);
        block[key] = isSingleProf
          ? this.isProfessionalBlockedAt(prof, slot)
          : false;
      });
    });

    this.availabilityMap.set(avail);
    this.blockedMap.set(block);
  }

  loadAppointments(): void {
    if (!this.branchId()) return;

    this.isLoading.set(true);

    const startDate = startOfLocalDate(this.date()).toISOString();
    const endDate = endOfLocalDate(this.date()).toISOString();

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

  // ─── Lógica de Arrastre con Pointer Events ──────────────────────────────

  onPointerDown(app: AppointmentUI, event: PointerEvent): void {
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
      new Date(this.date()),
    );
    this.agendaService.updateMousePosition(x, y);
    this.draggedApp.set(app);
    this.originalDate = new Date(this.date());
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

    const relativeX = x - rect.left;
    const relativeY = y - rect.top;

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

    const columnCount = this.professionals().length;
    if (columnCount === 0) return;

    const columnWidth = (totalWidth - timeColWidth) / columnCount;
    const profIndex = Math.floor((relativeX - timeColWidth) / columnWidth);

    const h = this.slotHeight();
    const rowIndex = Math.floor((relativeY - headerHeight) / h);

    if (
      profIndex >= 0 &&
      profIndex < columnCount &&
      rowIndex >= 0 &&
      rowIndex < this.timeSlots().length
    ) {
      const prof = this.professionals()[profIndex];
      const newPreview = {
        professionalId: prof.id,
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

    const newProfessionalId = preview.professionalId;
    const newIndex = Math.round(preview.top / this.slotHeight());
    const newTimeStr = this.timeSlots()[newIndex];

    if (!this.availabilityMap()[`${newProfessionalId}-${newTimeStr}`]) {
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
    const dateStr = format(this.date(), 'yyyy-MM-dd');
    const newStartTime = createLocalDate(dateStr, newTimeStr);
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    this.rawAppointments.update((apps) =>
      apps.map((a) =>
        a.id === app.id
          ? {
              ...a,
              professional: { ...a.professional, id: newProfessionalId },
              professionalId: newProfessionalId,
              startTime: newStartTime.toISOString(),
              endTime: newEndTime.toISOString(),
            }
          : a,
      ),
    );

    this.refreshUI(app);

    this.appointmentsService
      .update(app.id, {
        professionalId: newProfessionalId,
        startTime: newStartTime.toISOString(),
      })
      .subscribe({
        error: () => this.loadAppointments(),
      });

    this.onDragEnd();
  }

  onCellClick(prof: Professional, slot: string): void {
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    this.addAppointment.emit({ professional: prof, time: slot });
  }

  onDragEnd(): void {
    this.agendaService.stopDragging();
    this.draggedApp.set(null);
    this.dropPreview.set(null);
    this.originalDate = null;
    document.body.classList.remove('dragging-active');
  }

  onCellEnter(slot: string): void {
    this.hoveredSlot.set(slot);
  }

  onCellLeave(): void {
    this.hoveredSlot.set(null);
  }

  // ─── Lógica de Selección de Rango ──────────────────────────────────────

  onCellPointerDown(
    prof: Professional,
    slot: string,
    event: PointerEvent,
  ): void {
    // Solo clic izquierdo, si no es mobile y si no estamos ya arrastrando algo
    if (
      event.button !== 0 ||
      this.sidebarService.isMobile() ||
      this.agendaService.isDragging()
    )
      return;

    this.isSelectingRange.set(true);
    this.selectionStartSlot.set(slot);
    this.selectionEndSlot.set(slot);
    this.selectionProfessional.set(prof);

    // Desactivar selección de texto durante el arrastre
    document.body.classList.add('dragging-active');
  }

  onCellPointerEnter(slot: string): void {
    this.onCellEnter(slot);
    // Ya no actualizamos el rango aquí, lo hacemos por coordenadas para mayor robustez
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
    const prof = this.selectionProfessional();

    if (!startSlot || !endSlot || !prof) {
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

    this.addAppointment.emit({
      professional: prof,
      time: finalStartSlot,
      endTime: endTimeStr,
      x: event.clientX,
      y: event.clientY,
    });

    this.wasDragging = true;
    // No limpiamos inmediatamente para que el usuario vea qué está configurando
  }

  clearSelection(): void {
    this.onRangeSelectionEnd();
  }

  onRangeSelectionEnd(): void {
    this.isSelectingRange.set(false);
    this.selectionStartSlot.set(null);
    this.selectionEndSlot.set(null);
    this.selectionProfessional.set(null);
    document.body.classList.remove('dragging-active');
  }

  isProfessionalAvailableAt(prof: Professional, slot: string): boolean {
    let dayOfWeek = this.date().getDay();
    if (dayOfWeek === 0) dayOfWeek = 7; // Ajuste para nuestro estándar 1=Lun, 7=Dom

    const isOut = prof.exceptions?.some((ex) => {
      const start = startOfLocalDate(parseISODateToLocal(ex.date));
      const end = ex.endDate
        ? startOfLocalDate(parseISODateToLocal(ex.endDate))
        : start;
      const current = startOfDay(this.date());
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

  isProfessionalBlockedAt(prof: Professional, slot: string): boolean {
    const current = startOfDay(this.date());
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

  private revertDrop(app: Appointment): void {
    if (
      this.originalDate &&
      this.originalDate.getTime() !== this.date().getTime()
    ) {
      this.dateChange.emit(this.originalDate);
    }
    this.refreshUI(app);
  }

  private handleFailedDrop(app: Appointment): void {
    this.snackbarService.warning(
      'El profesional no está disponible en este horario o zona.',
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
}
