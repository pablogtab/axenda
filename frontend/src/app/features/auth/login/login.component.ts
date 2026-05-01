import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { environment } from '@env/environment';
import { TurnstileComponent } from '@shared/components/turnstile/turnstile.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TurnstileComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  @ViewChild(TurnstileComponent) turnstile!: TurnstileComponent;

  turnstileToken = signal<string | null>(environment.skipTurnstile ? 'skipped' : null);
  skipTurnstile = environment.skipTurnstile;
  showPassword = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    if (!environment.production) {
      this.loginForm.patchValue({
        email: 'admin@axenda.com',
        password: 'Password123!'
      });
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = {
        email: this.loginForm.value.email!,
        password: this.loginForm.value.password!,
        turnstileToken: this.turnstileToken()!
      };

      this.authService.login(credentials).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.error?.message || err.error?.message || 'Credenciales inválidas o error de conexión.';
          this.errorMessage = msg;
          
          if (!this.skipTurnstile) {
            this.turnstileToken.set(null);
            this.turnstile.reset();
          }
        }
      });
    }
  }
}
