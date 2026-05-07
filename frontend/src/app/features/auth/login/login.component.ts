import { Component, inject, signal, ViewChild, AfterViewInit } from '@angular/core';

declare var google: any;
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
export class LoginComponent implements AfterViewInit {
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
  isGoogleLoading = false;
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
        next: (data) => {
          if (data.onboardingCompleted) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/getting-started']);
          }
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

  ngAfterViewInit() {
    this.initGoogleButton();
  }

  private initGoogleButton(retries = 0) {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleLogin(response)
      });

      google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', width: '320', shape: 'pill' }
      );
    } else if (retries < 10) {
      // Reintentar cada 200ms hasta 10 veces si el script no ha cargado
      setTimeout(() => this.initGoogleButton(retries + 1), 200);
    }
  }

  handleGoogleLogin(response: any) {
    this.isLoading = true;
    this.isGoogleLoading = true;
    this.authService.googleLogin(response.credential, this.turnstileToken()).subscribe({
      next: (data) => {
        if (data.onboardingCompleted) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/getting-started']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.isGoogleLoading = false;
        const msg = err.error?.error?.message || err.error?.message || 'Error al iniciar sesión con Google';
        this.errorMessage = msg;
        if (!this.skipTurnstile) {
          this.turnstileToken.set(null);
          this.turnstile.reset();
        }
      }
    });
  }
}
