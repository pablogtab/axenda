import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  { 
    path: '', 
    title: 'Axenda - Gestión de Turnos y CRM',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent) 
  },
  { 
    path: 'login', 
    title: 'Axenda - Iniciar Sesión',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) 
  },
  { 
    path: 'register', 
    title: 'Axenda - Crear Cuenta',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) 
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
    path: ':publicSlug',
    loadComponent: () => import('./features/public/booking/booking.component').then(m => m.BookingComponent)
  }
];
