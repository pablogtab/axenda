import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const appRoutes: Routes = [
  {
    path: '',
    title: 'Axenda - Gestión de Turnos y CRM',
    loadComponent: () =>
      import('./features/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    title: 'Axenda - Iniciar Sesión',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'login/auth-bridge',
    title: 'Axenda - Acceso Delegado',
    loadComponent: () =>
      import('./features/auth/impersonate.component').then(
        (m) => m.ImpersonateComponent,
      ),
  },
  {
    path: 'register',
    title: 'Axenda - Crear Cuenta',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'precios',
    title: 'Axenda - Comparativa de Planes',
    loadComponent: () =>
      import('./features/pricing-comparison.component').then(
        (m) => m.PricingComparisonComponent,
      ),
  },
  {
    path: 'terminos',
    title: 'Axenda - Términos y Condiciones',
    loadComponent: () =>
      import('./features/terms.component').then((m) => m.TermsComponent),
  },
  {
    path: 'privacidad',
    title: 'Axenda - Política de Privacidad',
    loadComponent: () =>
      import('./features/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/layout.component').then(
        (m) => m.LayoutComponent,
      ),
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (m) => m.dashboardRoutes,
      ),
  },
  {
    path: 'getting-started',
    canActivate: [authGuard],
    title: 'Axenda - Empecemos',
    loadComponent: () =>
      import('./features/onboarding/getting-started.component').then(
        (m) => m.GettingStartedComponent,
      ),
  },
  {
    path: 'payment/success',
    title: 'Axenda - Pago Exitoso',
    loadComponent: () =>
      import('./features/public/payment-success.component').then(
        (m) => m.PaymentSuccessComponent,
      ),
  },
  {
    path: 'booking/cancel/:token',
    title: 'Axenda - Gestionar Turno',
    loadComponent: () =>
      import('./features/public/booking.component').then(
        (m) => m.BookingComponent,
      ),
  },
  {
    path: ':publicSlug',
    loadComponent: () =>
      import('./features/public/booking.component').then(
        (m) => m.BookingComponent,
      ),
  },
];
