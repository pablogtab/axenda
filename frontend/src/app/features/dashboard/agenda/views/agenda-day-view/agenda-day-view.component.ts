import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, ElementRef, OnInit, OnDestroy, effect, HostListener, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { format, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentsService, Appointment } from '@services/appointments.service';
import { Professional } from '@services/professionals.service';
import { UserConfigurationService } from '@services/user-configuration.service';
import { SnackbarService } from '@services/snackbar.service';
import { startOfLocalDate, endOfLocalDate, createLocalDate } from '@core/utils/date-utils';
import { AgendaZoomDirective } from '../../directives/agenda-zoom.directive';
import { AgendaTimeIndicatorComponent } from '../../components/agenda-time-indicator/agenda-time-indicator.component';
import { AgendaAppointmentCardComponent } from '../../components/agenda-appointment-card/agenda-appointment-card.component';
import { AgendaService } from '../../agenda.service';
import { SidebarService } from '@core/services/sidebar.service';

interface AppointmentUI extends Appointment {
  top: number;
  height: number;
}

@Component({
  selector: 'app-agenda-day-view',
  standalone: true,
  imports: [CommonModule, AgendaZoomDirective, AgendaTimeIndicatorComponent, AgendaAppointmentCardComponent],
  templateUrl: './agenda-day-view.component.html',
  styleUrls: ['./agenda-day-view.component.css'],
  styles: [`
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
  `]
})
export class AgendaDayViewComponent implements OnChanges, OnInit, OnDestroy {
  private appointmentsService = inject(AppointmentsService);
  private userConfig = inject(UserConfigurationService);
  private snackbarService = inject(SnackbarService);
  private el = inject(ElementRef);
  public agendaService = inject(AgendaService);
  public sidebarService = inject(SidebarService);

  date = input.required<Date>();
  @Input({ required: true }) branchId: string | null = null;
  @Input({ required: true }) professionals: Professional[] = [];
  @Input() selectedStatuses: string[] = [];

  @Output() addAppointment = new EventEmitter<{ professional: Professional, time: string, date?: Date, endTime?: string, x?: number, y?: number }>();
  @Output() editAppointment = new EventEmitter<{ appointment: Appointment, newDate?: Date }>();

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
  dropPreview = signal<{ professionalId: string, top: number, height: number } | null>(null);

  // Estados para selección de rango
  isSelectingRange = signal(false);
  selectionStartSlot = signal<string | null>(null);
  selectionEndSlot = signal<string | null>(null);
  selectionProfessional = signal<Professional | null>(null);

  selectionPreview = computed(() => {
    if (!this.selectionStartSlot() || !this.selectionEndSlot() || !this.selectionProfessional()) return null;
    
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
      height: (end - start + 1) * h
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

    const filteredRaw = this.rawAppointments().filter(app => 
      this.selectedStatuses.length === 0 || this.selectedStatuses.includes(app.status)
    );

    return filteredRaw.map(app => {
      const start = new Date(app.startTime);
      const end = new Date(app.endTime);
      const startStr = format(start, 'HH:mm');
      const startIndex = slots.findIndex(s => s === startStr);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);

      return {
        ...app,
        top: startIndex !== -1 ? startIndex * height : 0,
        height: (duration * height) / 15
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
      
      if (this.originalDate && this.originalDate.getTime() !== this.date().getTime()) {
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
    this.appointments().forEach(app => {
      const list = map.get(app.professional.id) || [];
      list.push(app);
      map.set(app.professional.id, list);
    });
    return map;
  });

  ngOnInit(): void {
    this.resizeObserver = new ResizeObserver(entries => {
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
    if (changes['date'] || changes['branchId'] || changes['professionals'] || changes['selectedStatuses']) {
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
    const isSingleProf = this.professionals.length === 1;

    this.professionals.forEach(prof => {
      this.timeSlots().forEach(slot => {
        const key = `${prof.id}-${slot}`;
        avail[key] = this.isProfessionalAvailableAt(prof, slot);
        block[key] = isSingleProf ? this.isProfessionalBlockedAt(prof, slot) : false;
      });
    });

    this.availabilityMap.set(avail);
    this.blockedMap.set(block);
  }

  loadAppointments(): void {
    if (!this.branchId) return;
    
    this.isLoading.set(true);
    
    const startDate = startOfLocalDate(this.date()).toISOString();
    const endDate = endOfLocalDate(this.date()).toISOString();

    this.appointmentsService.findAll({ 
      startDate, 
      endDate,
      branchId: this.branchId,
      statuses: this.selectedStatuses
    }).subscribe({
      next: (data) => {
        setTimeout(() => {
          const currentDragged = this.draggedApp();
          
          let finalData = [...data];
          if (currentDragged && !finalData.find(a => a.id === currentDragged.id)) {
            finalData.unshift(currentDragged);
          }

          this.rawAppointments.set(finalData);
          this.isLoading.set(false);
        }, 0);
      },
      error: () => this.isLoading.set(false)
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
      this.startDragging(app, startX, startY);
    }, 180); // 180ms delay para distinguir click de drag
  }

  private startDragging(app: AppointmentUI, x: number, y: number): void {
    this.isPreDragging = false;
    this.agendaService.setDragging(true, app, app.height, new Date(this.date()));
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
    
    if (relativeY < headerHeight || relativeX < timeColWidth || relativeX > totalWidth || relativeY > rect.height) {
      this.dropPreview.set(null);
      return;
    }
    
    const columnCount = this.professionals.length;
    if (columnCount === 0) return;

    const columnWidth = (totalWidth - timeColWidth) / columnCount;
    const profIndex = Math.floor((relativeX - timeColWidth) / columnWidth);
    
    const h = this.slotHeight();
    const rowIndex = Math.floor((relativeY - headerHeight) / h);
    
    if (profIndex >= 0 && profIndex < columnCount && rowIndex >= 0 && rowIndex < this.timeSlots().length) {
      const prof = this.professionals[profIndex];
      const newPreview = {
        professionalId: prof.id,
        top: rowIndex * h,
        height: this.draggedApp()?.height || 0
      };
      
      if (JSON.stringify(this.dropPreview()) !== JSON.stringify(newPreview)) {
        this.dropPreview.set(newPreview);
      }
    } else {
      this.dropPreview.set(null);
    }
  }

  private handleDropAction(): void {
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
      this.handleFailedDrop(app);
      this.onDragEnd();
      return;
    }

    const originalDuration = new Date(app.endTime).getTime() - new Date(app.startTime).getTime();
    const dateStr = format(this.date(), 'yyyy-MM-dd');
    const newStartTime = createLocalDate(dateStr, newTimeStr);
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);

    this.rawAppointments.update(apps => apps.map(a => 
      a.id === app.id ? { 
        ...a, 
        professional: { ...a.professional, id: newProfessionalId },
        professionalId: newProfessionalId,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString()
      } : a
    ));

    this.refreshUI(app);

    this.appointmentsService.update(app.id, {
      professionalId: newProfessionalId,
      startTime: newStartTime.toISOString()
    }).subscribe({
      error: () => this.loadAppointments()
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

  onCellPointerDown(prof: Professional, slot: string, event: PointerEvent): void {
    // Solo clic izquierdo, si no es mobile y si no estamos ya arrastrando algo
    if (event.button !== 0 || this.sidebarService.isMobile() || this.agendaService.isDragging()) return;

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
      y: event.clientY
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
    const dayOfWeek = this.date().getDay();
    const isOut = prof.exceptions?.some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      const current = startOfDay(this.date());
      return current >= start && current <= end && (ex.type === 'HOLIDAY' || ex.type === 'LEAVE');
    });
    if (isOut) return false;

    const blocks = prof.availability?.filter(a => a.dayOfWeek === dayOfWeek) || [];
    return blocks.some(b => slot >= b.startTime && slot < b.endTime);
  }

  isProfessionalBlockedAt(prof: Professional, slot: string): boolean {
    const current = startOfDay(this.date());
    return (prof.exceptions || []).some(ex => {
      const start = startOfDay(new Date(ex.date));
      const end = ex.endDate ? startOfDay(new Date(ex.endDate)) : start;
      return current >= start && current <= end && ex.type === 'BLOCK' && ex.startTime && ex.endTime && slot >= ex.startTime && slot < ex.endTime;
    });
  }

  private handleFailedDrop(app: Appointment): void {
    this.snackbarService.warning('El profesional no está disponible en este horario o zona.');
    if (this.originalDate && this.originalDate.getTime() !== this.date().getTime()) {
      this.dateChange.emit(this.originalDate);
    }
    this.refreshUI(app);
  }

  private refreshUI(app: Appointment): void {
    const current = this.rawAppointments();
    this.rawAppointments.set(current.filter(a => a.id !== app.id));
    setTimeout(() => this.rawAppointments.set(current), 0);
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
