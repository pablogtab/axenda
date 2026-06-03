import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-impersonate',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="impersonate-page">
      <div class="impersonate-card">
        <h1>Accediendo a la cuenta...</h1>
        <p>Estamos preparando tu sesión delegada en Axenda.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .impersonate-page {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: radial-gradient(
          circle at 10% 20%,
          #0f172a 0%,
          #020617 55%,
          #000 100%
        );
      }

      .impersonate-card {
        width: min(560px, 100%);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(14px);
        padding: 1.5rem;
        color: #e2e8f0;
        text-align: center;
      }

      .impersonate-card h1 {
        margin: 0;
        font-size: 1.2rem;
        color: #f8fafc;
      }

      .impersonate-card p {
        margin: 0.75rem 0 0;
        color: #94a3b8;
      }
    `,
  ],
})
export class ImpersonateComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const accessToken = queryParams.get('accessToken');
    const refreshToken = queryParams.get('refreshToken');
    const expiresAt = queryParams.get('expiresAt') ?? undefined;
    const refreshExpiresAt = queryParams.get('refreshExpiresAt') ?? undefined;

    if (!accessToken || !refreshToken) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.applyExternalSession({
      accessToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
    });

    this.router.navigate(['/dashboard'], { replaceUrl: true });
  }
}
