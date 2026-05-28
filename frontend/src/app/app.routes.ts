import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const appRoutes: Routes = [
  { 
    path: '', 
    title: 'Axenda - Gestión de Turnos y CRM',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent) 
  },
  { 
    path: 'login', 
    title: 'Axenda - Iniciar Sesión',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) 
  },
  { 
    path: 'register', 
    title: 'Axenda - Crear Cuenta',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) 
  },
  {
    path: 'precios',
    title: 'Axenda - Comparativa de Planes',
    loadComponent: () => import('./features/pricing-comparison/pricing-comparison.component').then(m => m.PricingComparisonComponent)
  },
  {
    path: 'terminos',
    title: 'Axenda - Términos y Condiciones',
    loadComponent: () => import('./features/terms/terms.component').then(m => m.TermsComponent)
  },
  {
    path: 'privacidad',
    title: 'Axenda - Política de Privacidad',
    loadComponent: () => import('./features/privacy/privacy.component').then(m => m.PrivacyComponent)
  },
  { 
    path: 'dashboard', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/layout/layout.component').then(m => m.LayoutComponent),
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
  },
  {
    path: 'getting-started',
    canActivate: [authGuard],
    title: 'Axenda - Empecemos',
    loadComponent: () => import('./features/onboarding/getting-started/getting-started.component').then(m => m.GettingStartedComponent)
  },
  {
    path: 'payment/success',
    title: 'Axenda - Pago Exitoso',
    loadComponent: () => import('./features/public/payment-success/payment-success.component').then(m => m.PaymentSuccessComponent)
  },
  {
    path: 'booking/cancel/:token',
    title: 'Axenda - Gestionar Turno',
    loadComponent: () => import('./features/public/booking/booking.component').then(m => m.BookingComponent)
  },
  {
    path: ':publicSlug',
    loadComponent: () => import('./features/public/booking/booking.component').then(m => m.BookingComponent)
  }
];
