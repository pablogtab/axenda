import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantsService, Tenant } from '../../../core/services/tenants.service';
import { PublicBookingService } from '../../../core/services/public-booking.service';
import { StoragePipe } from '../../../shared/pipes/storage.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, StoragePipe, FormsModule, IconComponent],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tenantsService = inject(TenantsService);
  private bookingService = inject(PublicBookingService);
  private titleService = inject(Title);

  tenant = signal<Tenant | null>(null);
  loading = signal(true);
  error = signal(false);
  success = signal(false);
  isBooking = signal(false);

  // Cancellation and Rescheduling State
  token = signal<string | null>(null);
  appointment = signal<any | null>(null);
  isCancelMode = signal(false);
  isRescheduling = signal(false);
  isActionTimeLimitPassed = signal(false);
  timeLimitMessage = signal('');

  // Stepper State
  currentStep = signal(1);
  
  steps = computed(() => {
    const t = this.tenant();
    if (!t) return [];

    const dynamicSteps = [];
    
    // Step: Branch (If enabled and more than 1 branch)
    if (t.publicShowBranchSelection && t.branches && t.branches.length > 1) {
      dynamicSteps.push({ id: 'branch', label: 'Sucursal' });
    }

    dynamicSteps.push({ id: 'services', label: 'Servicios' });

    // Step: Professional (If enabled)
    if (t.publicShowProfessionalSelection) {
      dynamicSteps.push({ id: 'professional', label: 'Profesional' });
    }

    dynamicSteps.push({ id: 'schedule', label: 'Horario' });
    dynamicSteps.push({ id: 'personal', label: 'Tus Datos' });

    return dynamicSteps;
  });

  // Selection State
  selectedBranch = signal<any | null>(null);
  selectedService = signal<any | null>(null);
  selectedProfessional = signal<any | null>(null);
  selectedDate = signal<Date | null>(null);
  selectedTime = signal<string | null>(null);
  
  availableSlots = signal<{ time: string; available: boolean }[]>([]);

  loadingSlots = signal(false);
  slotError = signal<string | null>(null);

  // Client Info State
  clientName = signal('');
  clientEmail = signal('');
  clientPhone = signal('');

  availableServices = computed(() => this.tenant()?.services || []);
  availableBranches = computed(() => this.tenant()?.branches || []);
  
  // Profesionales que ofrecen el servicio seleccionado
  availableProfessionals = computed(() => {
    const service = this.selectedService();
    if (!service || !service.professionals) return [];
    return service.professionals.map((p: any) => p.professional);
  });

  brandStyles = computed(() => {
    const t = this.tenant();
    if (!t) return {};
    return {
      '--color-primary': t.primaryColor || '#6366f1',
      '--color-primary-hover': t.primaryHoverColor || '#4f46e5',
      '--color-accent': t.accentColor || '#a855f7',
      '--color-bg-primary': t.backgroundColor || '#0a0b14',
      '--color-text-main': t.textColor || '#f8fafc'
    };
  });

  // Calendar State
  currentMonth = signal<Date>(new Date());
  calendarDays = computed(() => {
    // Dependencias para que se regenere al cambiar estos valores
    this.selectedProfessional();
    this.selectedBranch();
    return this.generateCalendar(this.currentMonth());
  });

  constructor() {
    effect(() => {
      const date = this.selectedDate();
      const service = this.selectedService();
      const branch = this.selectedBranch();
      const prof = this.selectedProfessional();
      const tenant = this.tenant();

      if (date && service && branch && prof && tenant && (this.currentStepId() === 'schedule' || this.isRescheduling())) {
        this.loadAvailability();
      }
    });
  }

  private generateCalendar(monthDate: Date) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Padding start (previous month days)
    const startPadding = firstDay.getDay(); // 0 = Sunday
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        month: month - 1,
        year,
        isPadding: true
      });
    }
    
    // Current month days
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
      const prof = this.selectedProfessional();
      const branch = this.selectedBranch();
      
      let hasAvailability = false;
      if (prof && branch) {
        // 1. Check weekly schedule
        const weeklyMatch = prof.availability?.some((a: any) => 
          a.dayOfWeek === dayOfWeek && a.branchId === branch.id
        );

        // 2. Check if it's a holiday/leave for this professional
        const isOut = prof.exceptions?.some((ex: any) => {
          const exDate = new Date(ex.date);
          exDate.setHours(0,0,0,0);
          const end = ex.endDate ? new Date(ex.endDate) : exDate;
          end.setHours(0,0,0,0);
          return d >= exDate && d <= end && (ex.type === 'HOLIDAY' || ex.type === 'LEAVE');
        });

        hasAvailability = !!weeklyMatch && !isOut;
      }

      days.push({
        day: i,
        month,
        year,
        isPadding: false,
        isToday: d.getTime() === today.getTime(),
        isPast: d.getTime() < today.getTime(),
        hasAvailability,
        date: d
      });
    }
    
    return days;
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  prevMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  selectDate(date: Date) {
    this.selectedDate.set(date);
    this.selectedTime.set(null); // Reset time when date changes
  }

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('publicSlug');
    const token = this.route.snapshot.paramMap.get('token');

    if (token) {
      this.token.set(token);
      this.isCancelMode.set(true);
      this.loadAppointment(token);
    } else if (slug) {
      this.loadTenant(slug);
    } else {
      this.router.navigate(['/']);
    }
  }

  checkCancellationLimit(appt: any) {
    const limit = appt.tenant.cancellationLimit || '24h';

    if (limit === 'never') {
      this.isActionTimeLimitPassed.set(true);
      this.timeLimitMessage.set('Este negocio no permite cancelaciones o reprogramaciones online.');
      return;
    }

    // Convert limit to minutes
    let limitMins = 24 * 60; // default 24h
    const match = limit.match(/^(\d+)([hm])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      if (unit === 'h') {
        limitMins = value * 60;
      } else if (unit === 'm') {
        limitMins = value;
      }
    }

    const now = new Date();
    const appointmentStart = new Date(appt.startTime);
    const diffMs = appointmentStart.getTime() - now.getTime();
    const diffMins = diffMs / 60000;

    if (diffMins < limitMins) {
      this.isActionTimeLimitPassed.set(true);
      const limitHours = limitMins / 60;
      const limitText = limitHours >= 1 
        ? `${limitHours} ${limitHours === 1 ? 'hora' : 'horas'}`
        : `${limitMins} minutos`;
      this.timeLimitMessage.set(
        `El plazo para cancelar o reprogramar online ha expirado (debe realizarse con al menos ${limitText} de anticipación).`
      );
    } else {
      this.isActionTimeLimitPassed.set(false);
      this.timeLimitMessage.set('');
    }
  }

  loadAppointment(token: string) {
    this.loading.set(true);
    this.error.set(false);

    this.bookingService.getAppointmentByToken(token).subscribe({
      next: (appt) => {
        this.appointment.set(appt);
        this.tenant.set(appt.tenant);
        this.titleService.setTitle(`Gestionar Turno - ${appt.tenant.name}`);
        
        // Preload values for scheduling
        this.selectedBranch.set(appt.branch);
        this.selectedService.set(appt.service);
        this.selectedProfessional.set(appt.professional);

        // Check limit
        this.checkCancellationLimit(appt);
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading appointment:', err);
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  loadTenant(slug: string) {
    this.tenantsService.getPublicInfo(slug).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.titleService.setTitle(`${tenant.name} - Turnos Online`);
        if (tenant.branches && tenant.branches.length > 0) {
          this.selectedBranch.set(tenant.branches[0]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.router.navigate(['/']);
      }
    });
  }

  currentStepId() {
    return this.steps()[this.currentStep() - 1]?.id;
  }

  loadAvailability() {
    const tenant = this.tenant();
    const date = this.selectedDate();
    const service = this.selectedService();
    const branch = this.selectedBranch();
    const prof = this.selectedProfessional();

    if (!tenant || !date || !service || !branch || !prof) return;

    const slug = tenant.publicSlug || this.route.snapshot.paramMap.get('publicSlug') || '';

    this.loadingSlots.set(true);
    this.slotError.set(null);

    const appt = this.appointment();

    this.bookingService.getAvailability(slug, {
      professionalId: prof.id,
      serviceId: service.id,
      branchId: branch.id,
      date: this.formatDate(date),
      excludeAppointmentId: appt?.id
    }).subscribe({
      next: (slots) => {
        this.availableSlots.set(slots);
        this.loadingSlots.set(false);
      },
      error: (err) => {
        console.error('Error loading slots:', err);
        this.slotError.set('Error al cargar horarios. Intente otra fecha.');
        this.loadingSlots.set(false);
      }
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  selectBranch(branch: any) {
    this.selectedBranch.set(branch);
  }

  selectService(service: any) {
    this.selectedService.set(service);
    
    // Si no se muestra selección de profesional, asignar el primero automáticamente
    if (!this.tenant()?.publicShowProfessionalSelection && service.professionals?.length > 0) {
      this.selectedProfessional.set(service.professionals[0].professional);
    }
  }

  selectProfessional(prof: any) {
    this.selectedProfessional.set(prof);
  }

  canContinue(): boolean {
    const stepId = this.currentStepId();
    if (stepId === 'branch') return !!this.selectedBranch();
    if (stepId === 'services') return !!this.selectedService();
    if (stepId === 'professional') return !!this.selectedProfessional();
    if (stepId === 'schedule') return !!this.selectedDate() && !!this.selectedTime();
    if (stepId === 'personal') return !!this.clientName().trim() && !!this.clientEmail().trim() && !!this.clientPhone().trim();
    return true;
  }

  nextStep() {
    if (this.canContinue() && this.currentStep() < this.steps().length) {
      this.currentStep.update(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (this.currentStep() === this.steps().length) {
      this.confirmBooking();
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  confirmBooking() {
    if (!this.canContinue() || this.isBooking()) return;

    this.isBooking.set(true);
    const tenant = this.tenant()!;
    const service = this.selectedService()!;
    const date = this.selectedDate()!;
    const time = this.selectedTime()!;
    const prof = this.selectedProfessional()!;

    const [hours, minutes] = time.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);

    const token = this.token();

    if (this.isCancelMode() && this.isRescheduling() && token) {
      this.bookingService.rescheduleAppointment(token, startTime.toISOString()).subscribe({
        next: (updatedAppt) => {
          this.appointment.set(updatedAppt);
          this.success.set(true);
          this.isRescheduling.set(false);
          this.isBooking.set(false);
        },
        error: (err) => {
          alert(err.error?.message || 'Error al reprogramar el turno. Por favor intente nuevamente.');
          this.isBooking.set(false);
        }
      });
      return;
    }

    const bookingData = {
      professionalId: prof.id,
      serviceId: service.id,
      branchId: this.selectedBranch()?.id,
      startTime: startTime.toISOString(),
      clientName: this.clientName(),
      clientEmail: this.clientEmail(),
      clientPhone: this.clientPhone(),
    };

    const slug = tenant.publicSlug || this.route.snapshot.paramMap.get('publicSlug') || '';

    this.bookingService.book(slug, bookingData).subscribe({
      next: () => {
        this.success.set(true);
        this.isBooking.set(false);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al agendar el turno. Por favor intente nuevamente.');
        this.isBooking.set(false);
      }
    });
  }

  cancelAppointment() {
    const token = this.token();
    if (!token || this.isBooking() || this.isActionTimeLimitPassed()) return;

    if (!confirm('¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.')) {
      return;
    }

    this.isBooking.set(true);
    this.bookingService.cancelAppointment(token).subscribe({
      next: () => {
        const appt = this.appointment();
        if (appt) {
          appt.status = 'CANCELLED';
          this.appointment.set({ ...appt });
        }
        this.success.set(true);
        this.isBooking.set(false);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al cancelar el turno. Por favor intente de nuevo.');
        this.isBooking.set(false);
      }
    });
  }

  startRescheduling() {
    if (this.isActionTimeLimitPassed()) return;
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.availableSlots.set([]);
    this.isRescheduling.set(true);
  }

  cancelRescheduling() {
    this.isRescheduling.set(false);
  }

  goBackToBusiness() {
    const slug = this.tenant()?.publicSlug || this.route.snapshot.paramMap.get('publicSlug');
    if (slug) {
      this.router.navigate([`/${slug}`]);
    } else {
      this.router.navigate(['/']);
    }
  }

  goToHome() {
    if (this.isCancelMode()) {
      this.goBackToBusiness();
      return;
    }
    this.success.set(false);
    this.currentStep.set(1);
    this.selectedService.set(null);
    this.selectedProfessional.set(null);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.availableSlots.set([]);
    this.slotError.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
