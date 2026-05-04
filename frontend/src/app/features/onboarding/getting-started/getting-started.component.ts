import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantsService } from '@services/tenants.service';
import { AuthService } from '@services/auth.service';
import { ImageUploaderComponent } from '@shared/components/image-uploader/image-uploader.component';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploaderComponent],
  templateUrl: './getting-started.component.html',
  styleUrl: './getting-started.component.css'
})
export class GettingStartedComponent implements OnInit {
  private tenantsService = inject(TenantsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  businessName = signal<string>('');
  logoUrl = signal<string | null>(null);
  tenantId = signal<string>('');
  currentStep = signal(1);
  selectedCategory = signal<string | null>(null);
  isLoading = false;

  // New Step: Branch & Professional Info
  branchName = signal<string>('');
  branchAddress = signal<string>('');
  professionalFirstName = signal<string>('');
  professionalLastName = signal<string>('');

  // Plan Advisor Levels (Indices for discrete sliders)
  appointmentsLevel = signal<number>(0); // 0: 25, 1: 100, 2: 500
  professionalsLevel = signal<number>(0); // 0: 1, 1: 5, 2: 20
  branchesCount = signal<number>(1);
  wantsWhatsApp = signal<boolean>(false);
  wantsPayments = signal<boolean>(false);

  // Schedule Signals
  workingDays = signal<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  startTime = signal<string>('09:00');
  endTime = signal<string>('18:00');

  // Constants for slider values
  readonly APP_LEVELS = [25, 100, 500];
  readonly PRO_LEVELS = [1, 5, 20];

  // Service Selection Signal
  loadDefaultServices = signal<boolean>(true);

  // Example services based on category
  categoryServices = computed(() => {
    const category = this.selectedCategory();
    if (!category) return [];
    
    const defaults: Record<string, string[]> = {
      'barbershop': ['Corte de Cabello', 'Barba & Perfilado', 'Coloración'],
      'medical': ['Consulta Médica', 'Control / Seguimiento', 'Estudio Médico'],
      'beauty': ['Limpieza Facial', 'Manicuría / Pedicuría', 'Depilación'],
      'fitness': ['Clase Personalizada', 'Evaluación Física', 'Yoga / Pilates'],
      'legal': ['Asesoría Legal', 'Revisión de Contratos', 'Mediación'],
      'generic': ['Servicio Estándar', 'Consulta General']
    };
    
    return defaults[category.toLowerCase()] || [];
  });

  // Recommendation Logic
  recommendedPlan = computed(() => {
    const vol = this.APP_LEVELS[this.appointmentsLevel()];
    const pros = this.PRO_LEVELS[this.professionalsLevel()];
    const branches = this.branchesCount();

    const isElite = branches > 1 || pros > 5 || vol > 100;
    const isBusiness = this.wantsWhatsApp() || pros > 1 || vol > 100;
    const isPro = this.wantsPayments() || vol > 25;

    if (isElite) return { name: 'Elite', icon: 'rocket_launch', price: '$45.000', color: 'text-primary', desc: 'Para grandes cadenas y franquicias.' };
    if (isBusiness) return { name: 'Business', icon: 'business_center', price: '$25.000', color: 'text-primary', desc: 'Ideal para equipos con automatización.' };
    if (isPro) return { name: 'Pro', icon: 'stars', color: 'text-primary', price: '$12.000', desc: 'Perfecto para profesionales en crecimiento.' };
    return { name: 'Starter', icon: 'person', color: 'text-white/40', price: '$0', desc: 'Todo lo necesario para empezar.' };
  });



  finishOnboarding() {
    console.log('Redirecting to dashboard...');
    window.location.href = '/dashboard'; // O el path que corresponda
  }

  categories = [
    { id: 'barbershop', name: 'Barbería / Peluquería', icon: '✂️' },
    { id: 'medical', name: 'Salud / Consultorio', icon: '🩺' },
    { id: 'beauty', name: 'Estética / Spa', icon: '✨' },
    { id: 'fitness', name: 'Fitness / Yoga', icon: '🧘' },
    { id: 'legal', name: 'Legal / Contable', icon: '⚖️' },
    { id: 'generic', name: 'Otro Servicio', icon: '🏢' }
  ];

  ngOnInit() {
    this.tenantsService.getMe().subscribe({
      next: (tenant) => {
        this.tenantId.set(tenant.id);
        this.businessName.set(tenant.name);
        this.logoUrl.set(tenant.logoUrl || null);
        if (tenant.onboardingCompleted) {
          this.router.navigate(['/dashboard']);
        }
      }
    });
  }

  nextStep() {
    if (this.currentStep() < 6) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  async completeOnboarding() {
    this.isLoading = true;
    
    const onboardingData = {
      name: this.businessName(),
      logoUrl: this.logoUrl() || undefined,
      mode: this.selectedCategory()?.toUpperCase() || 'GENERIC',
      onboardingCompleted: true,
      branchName: this.branchName() || this.businessName(),
      branchAddress: this.branchAddress(),
      professionalFirstName: this.professionalFirstName(),
      professionalLastName: this.professionalLastName(),
      availability: this.workingDays().map(day => ({
        dayOfWeek: day,
        startTime: this.startTime(),
        endTime: this.endTime()
      })),
      // Metadata for setup logic in backend
      metadata: {
        plan: this.recommendedPlan().name,
        loadDefaults: this.loadDefaultServices(),
        setup: {
          volume: this.APP_LEVELS[this.appointmentsLevel()],
          teamSize: this.PRO_LEVELS[this.professionalsLevel()],
          whatsapp: this.wantsWhatsApp(),
          payments: this.wantsPayments()
        }
      }
    };

    this.tenantsService.completeOnboarding(onboardingData).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep.set(6);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error completing onboarding', err);
      }
    });
  }

  onLogoUploaded(fileKey: string) {
    this.logoUrl.set(fileKey);
  }

  days = [
    { id: 1, label: 'L' },
    { id: 2, label: 'M' },
    { id: 3, label: 'M' },
    { id: 4, label: 'J' },
    { id: 5, label: 'V' },
    { id: 6, label: 'S' },
    { id: 0, label: 'D' }
  ];

  toggleDay(dayId: number) {
    const current = this.workingDays();
    if (current.includes(dayId)) {
      this.workingDays.set(current.filter(d => d !== dayId));
    } else {
      this.workingDays.set([...current, dayId].sort((a, b) => a - b));
    }
  }
}
