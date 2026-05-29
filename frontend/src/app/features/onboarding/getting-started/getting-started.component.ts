import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TenantsService } from '@services/tenants.service';
import { AuthService } from '@services/auth.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { TimeInputComponent } from '@shared/components/time-input/time-input';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TimeInputComponent],
  templateUrl: './getting-started.component.html',
  styleUrl: './getting-started.component.css'
})
export class GettingStartedComponent implements OnInit {
  private tenantsService = inject(TenantsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);

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

  // Schedule Signals
  workingDays = signal<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  startTime = signal<string>('09:00');
  endTime = signal<string>('18:00');

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

    this.http.get<any>(`${environment.apiUrl}/users/me`).subscribe({
      next: (user) => {
        if (user) {
          this.professionalFirstName.set(user.firstName || '');
          this.professionalLastName.set(user.lastName || '');
        }
      },
      error: (err) => console.error('Error al cargar datos del usuario para el onboarding:', err)
    });
  }

  nextStep() {
    if (this.currentStep() < 5) {
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
      // Metadata for setup logic in backend (static defaults to satisfy backend DTO validation)
      metadata: {
        plan: 'Pro',
        loadDefaults: this.loadDefaultServices(),
        setup: {
          volume: 100,
          teamSize: 5,
          whatsapp: false,
          payments: false
        }
      }
    };

    this.tenantsService.completeOnboarding(onboardingData).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep.set(5);
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
