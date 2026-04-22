import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { 
    path: 'login', 
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
        loadComponent: () => import('./features/dashboard/home/home.component').then(m => m.HomeComponent) 
      },
      { 
        path: 'agenda', 
        loadComponent: () => import('./features/dashboard/agenda/agenda.component').then(m => m.AgendaComponent) 
      },
      { 
        path: 'clients', 
        loadComponent: () => import('./features/dashboard/clients/clients-list/clients-list.component').then(m => m.ClientsListComponent) 
      },
      { 
        path: 'services', 
        loadComponent: () => import('./features/dashboard/services/services-list/services-list.component').then(m => m.ServicesListComponent) 
      }
    ]
  }
];
