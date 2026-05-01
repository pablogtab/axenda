import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals para el estado
  step = signal<1 | 2>(1);
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Formulario Paso 1: Organización y Email
  step1Form = this.fb.group({
    organizationName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]]
  });

  // Formulario Paso 2: Datos Personales y Verificación
  step2Form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(control: any) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    return password && confirmPassword && password.value === confirmPassword.value 
      ? null : { passwordMismatch: true };
  }

  getPasswordStrength(): { score: number; label: string; color: string } {
    const pwd = this.step2Form.value.password || '';
    if (!pwd) return { score: 0, label: '', color: 'bg-white/10' };
    
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: 'Débil', color: 'bg-error' };
    if (score <= 4) return { score, label: 'Media', color: 'bg-warning' };
    return { score, label: 'Fuerte', color: 'bg-success' };
  }

  onNext(): void {
    if (this.step1Form.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const data = {
        organizationName: this.step1Form.value.organizationName!,
        email: this.step1Form.value.email!
      };

      this.authService.registerStart(data).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.step2Form.markAsUntouched();
          this.step2Form.markAsPristine();
          this.step.set(2);
        },
        error: (err) => {
          this.isLoading.set(false);
          // Manejar estructura de error anidada del filtro global del backend
          const msg = err.error?.error?.message || err.error?.message || 'Error al iniciar el registro. Reintente.';
          this.errorMessage.set(msg);
        }
      });
    }
  }

  onSubmit(): void {
    if (this.step2Form.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const data = {
        email: this.step1Form.value.email!,
        code: this.step2Form.value.code!,
        firstName: this.step2Form.value.firstName!,
        lastName: this.step2Form.value.lastName!,
        password: this.step2Form.value.password!
      };

      this.authService.registerComplete(data).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.error?.message || err.error?.message || 'Código inválido o error al completar registro.';
          this.errorMessage.set(msg);
        }
      });
    }
  }

  goBack(): void {
    this.step.set(1);
    this.errorMessage.set('');
  }

  onlyNumbers(event: KeyboardEvent): void {
    const pattern = /[0-9]/;
    const inputChar = String.fromCharCode(event.charCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }
}
