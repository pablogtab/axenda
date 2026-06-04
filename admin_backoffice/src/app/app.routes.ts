import { Routes } from '@angular/router';
import { LoginComponent } from './views/login/login.component';
import { LayoutComponent } from './views/layout/layout.component';
import { DashboardComponent } from './views/dashboard/dashboard.component';
import { TenantsComponent } from './views/tenants/tenants.component';
import { CouponsComponent } from './views/coupons/coupons.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'metrics',
        pathMatch: 'full',
      },
      {
        path: 'metrics',
        component: DashboardComponent,
      },
      {
        path: 'tenants',
        component: TenantsComponent,
      },
      {
        path: 'coupons',
        component: CouponsComponent,
      },
    ],
  },
  {
    path: '',
    redirectTo: 'dashboard/metrics',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'dashboard/metrics',
  },
];

