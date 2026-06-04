import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  template: `
    <div class="login-container">
      <p-card header="Axenda Backoffice" subheader="Acceso de Administrador" styleClass="login-card">
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="login-form">
          <div class="field">
            <label for="email" class="field-label">Email</label>
            <input 
              id="email" 
              type="email" 
              pInputText 
              [(ngModel)]="email" 
              name="email" 
              required 
              email 
              class="w-full"
            />
          </div>

          <div class="field">
            <label for="password" class="field-label">Contraseña</label>
            <p-password 
              id="password" 
              [(ngModel)]="password" 
              name="password" 
              [feedback]="false" 
              [toggleMask]="true"
              styleClass="w-full" 
              inputStyleClass="w-full"
              required
            ></p-password>
          </div>

          <div *ngIf="errorMessage()" class="error-container">
            <span class="error-text">{{ errorMessage() }}</span>
          </div>

          <p-button 
            type="submit" 
            label="Iniciar Sesión" 
            [loading]="isLoading()" 
            [disabled]="!loginForm.form.valid"
            styleClass="w-full p-button-primary mt-3"
          ></p-button>
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e1e2f 0%, #111119 100%);
      padding: 1rem;
    }
    ::ng-deep .login-card {
      width: 100%;
      max-width: 420px;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      background-color: #1d1d2b !important;
      color: #e2e8f0 !important;
      border: 1px solid #2d2d3f;
    }
    ::ng-deep .login-card .p-card-title {
      color: #ffffff;
      font-weight: 800;
      text-align: center;
    }
    ::ng-deep .login-card .p-card-subtitle {
      color: #94a3b8;
      text-align: center;
      margin-bottom: 2rem;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .field-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #94a3b8;
    }
    .error-container {
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 6px;
      padding: 0.75rem;
      text-align: center;
    }
    .error-text {
      color: #ef4444;
      font-size: 0.875rem;
      font-weight: 500;
    }
    input {
      background-color: #111119 !important;
      color: #ffffff !important;
      border: 1px solid #2d2d3f !important;
      padding: 0.75rem !important;
    }
    input:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 1px #3b82f6 !important;
    }
    ::ng-deep p-password input {
      background-color: #111119 !important;
      color: #ffffff !important;
      border: 1px solid #2d2d3f !important;
      padding: 0.75rem !important;
    }
  `],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard/metrics']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.error?.message || 
          err.error?.message || 
          'Error al iniciar sesión. Verifica tus credenciales.'
        );
      },
    });
  }
}
