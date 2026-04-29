import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { 
    path: 'login', 
    title: 'Axenda - Iniciar Sesión',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) 
  },
  { 
    path: 'dashboard', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { 
        path: 'home', 
        title: 'Axenda - Inicio',
        loadComponent: () => import('./features/dashboard/home/home.component').then(m => m.HomeComponent) 
      },
      {
        path: 'agenda',
        title: 'Axenda - Mi Agenda',
        loadComponent: () => import('./features/dashboard/agenda/agenda.component').then(m => m.AgendaComponent)
      },
      { 
        path: 'clients', 
        title: 'Axenda - Clientes',
        loadComponent: () => import('./features/dashboard/clients/clients-list/clients-list.component').then(m => m.ClientsListComponent) 
      },
      { 
        path: 'services', 
        title: 'Axenda - Servicios',
        loadComponent: () => import('./features/dashboard/services/services-list/services-list.component').then(m => m.ServicesListComponent) 
      },
      { 
        path: 'branches', 
        loadComponent: () => import('./features/dashboard/branches/branches-list/branches-list.component').then(m => m.BranchesListComponent) 
      },
      {
        path: 'professionals',
        title: 'Axenda - Profesionales',
        loadComponent: () => import('./features/dashboard/professionals/professionals-list/professionals-list.component').then(m => m.ProfessionalsListComponent)
      },
      {
        path: 'professionals/:id/availability',
        loadComponent: () => import('./features/dashboard/professionals/professional-availability/professional-availability.component').then(m => m.ProfessionalAvailabilityComponent)
      },
      {
        path: 'settings',
        title: 'Axenda - Configuración',
        loadComponent: () => import('./features/dashboard/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: ':publicSlug',
    loadComponent: () => import('./features/public/booking/booking.component').then(m => m.BookingComponent)
  }
];
