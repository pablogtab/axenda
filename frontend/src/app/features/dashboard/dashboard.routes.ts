import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { AgendaComponent } from './agenda/agenda.component';
import { ClientsListComponent } from './clients/clients-list/clients-list.component';
import { ServicesListComponent } from './services/services-list/services-list.component';
import { BranchesListComponent } from './branches/branches-list/branches-list.component';
import { ProfessionalsListComponent } from './professionals/professionals-list/professionals-list.component';
import { ProfessionalAvailabilityComponent } from './professionals/professional-availability/professional-availability.component';
import { SettingsComponent } from './settings/settings.component';

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
    path: 'services', 
    title: 'Axenda - Servicios',
    component: ServicesListComponent
  },
  { 
    path: 'branches', 
    component: BranchesListComponent
  },
  {
    path: 'professionals',
    title: 'Axenda - Profesionales',
    component: ProfessionalsListComponent
  },
  {
    path: 'professionals/:id/availability',
    component: ProfessionalAvailabilityComponent
  },
  {
    path: 'settings',
    title: 'Axenda - Configuración',
    component: SettingsComponent
  }
];
