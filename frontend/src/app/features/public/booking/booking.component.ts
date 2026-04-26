import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantsService, Tenant } from '../../../core/services/tenants.service';
import { StoragePipe } from '../../../shared/pipes/storage.pipe';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, StoragePipe],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tenantsService = inject(TenantsService);

  tenant = signal<Tenant | null>(null);
  loading = signal(true);
  error = signal(false);

  // Stepper State
  currentStep = signal(1);
  steps = [
    { id: 'services', label: 'Servicios' },
    { id: 'date', label: 'Fecha' },
    { id: 'time', label: 'Horario' },
    { id: 'email', label: 'Email' },
    { id: 'personal', label: 'Información Personal' }
  ];

  // Selection State
  selectedService = signal<any | null>(null);
  selectedBranch = signal<any | null>(null);
  selectedDate = signal<Date | null>(null);
  selectedTime = signal<string | null>(null);

  availableServices = computed(() => this.tenant()?.services || []);
  availableBranches = computed(() => this.tenant()?.branches || []);

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
        // Default branch if exists
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

  selectService(service: any) {
    this.selectedService.set(service);
  }

  onDateChange(event: any) {
    const dateStr = event.target.value;
    if (dateStr) {
      this.selectedDate.set(new Date(dateStr));
    }
  }

  canContinue(): boolean {
    const step = this.currentStep();
    if (step === 1) return !!this.selectedService();
    if (step === 2) return !!this.selectedDate();
    if (step === 3) return !!this.selectedTime();
    return true;
  }

  nextStep() {
    if (this.canContinue() && this.currentStep() < this.steps.length) {
      this.currentStep.update(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
