import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { AgendaComponent } from './agenda/agenda.component';
import { ClientsListComponent } from './clients/clients-list/clients-list.component';
import { ServicesListComponent } from './services/services-list/services-list.component';
import { BranchesListComponent } from './branches/branches-list/branches-list.component';
import { ProfessionalsListComponent } from './professionals/professionals-list/professionals-list.component';
import { ProfessionalAvailabilityComponent } from './professionals/professional-availability/professional-availability.component';
import { SettingsComponent } from './settings/settings.component';
import { SubscriptionSuccessComponent } from './subscription/subscription-success.component';

export const dashboardRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { 
    path: 'home', 
    title: 'Axenda - Inicio',
    component: HomeComponent
  },
  {
    path: 'agenda',
    title: 'Axenda - Mi Agenda',
    component: AgendaComponent
  },
  { 
    path: 'clients', 
    title: 'Axenda - Clientes',
    component: ClientsListComponent
  },
  {
    path: 'settings',
    title: 'Axenda - Configuración',
    component: SettingsComponent
  },
  {
    path: 'subscription/plans',
    title: 'Axenda - Planes y Precios',
    loadComponent: () => import('./subscription/subscription-plans.component').then(m => m.SubscriptionPlansComponent)
  },
  {
    path: 'subscription/success',
    title: 'Axenda - Suscripción Exitosa',
    component: SubscriptionSuccessComponent
  }
];
