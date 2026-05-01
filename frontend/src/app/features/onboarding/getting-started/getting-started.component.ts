import { Component, inject, signal, OnInit } from '@angular/core';
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
    if (this.currentStep() < 3) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  completeOnboarding() {
    this.isLoading = true;
    this.tenantsService.updateMe({
      name: this.businessName(),
      logoUrl: this.logoUrl() || undefined,
      mode: this.selectedCategory()?.toUpperCase() || 'GENERIC',
      onboardingCompleted: true
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        // Manejar error si es necesario
      }
    });
  }

  onLogoUploaded(fileKey: string) {
    this.logoUrl.set(fileKey);
  }
}
