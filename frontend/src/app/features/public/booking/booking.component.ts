import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantsService, Tenant } from '../../../core/services/tenants.service';
import { PublicBookingService } from '../../../core/services/public-booking.service';
import { StoragePipe } from '../../../shared/pipes/storage.pipe';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, StoragePipe, FormsModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tenantsService = inject(TenantsService);
  private bookingService = inject(PublicBookingService);

  tenant = signal<Tenant | null>(null);
  loading = signal(true);
  error = signal(false);
  success = signal(false);
  isBooking = signal(false);

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

      if (date && service && branch && prof && tenant && this.currentStepId() === 'schedule') {
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
    if (slug) {
      this.loadTenant(slug);
    } else {
      this.loading.set(false);
      this.error.set(true);
    }
  }

  loadTenant(slug: string) {
    this.tenantsService.getPublicInfo(slug).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        if (tenant.branches && tenant.branches.length > 0) {
          this.selectedBranch.set(tenant.branches[0]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
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

    this.bookingService.getAvailability(slug, {
      professionalId: prof.id,
      serviceId: service.id,
      branchId: branch.id,
      date: this.formatDate(date)
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

  goToHome() {
    // En lugar de ir al "/" (inicio del portal), reiniciamos el formulario en la misma página pública
    this.success.set(false);
    this.currentStep.set(1);
    this.selectedService.set(null);
    this.selectedProfessional.set(null);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.availableSlots.set([]);
    this.slotError.set(null);
    // Nota: mantenemos la sucursal seleccionada si el negocio tiene sucursales, 
    // o el cliente podría querer elegir otra. Lo dejamos a paso 1.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
