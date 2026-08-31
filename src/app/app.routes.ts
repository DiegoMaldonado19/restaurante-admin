import { Routes } from '@angular/router';
import { AppShell } from './layout/app-shell';
import { PublicShell } from './layout/public-shell';
import { authGuard, roleGuard } from './core/role.guard';

/**
 * Toda ruta de modulo va con loadComponent: es lo que mantiene el presupuesto inicial
 * de 500 kB que angular.json declara y que el build de CI hace cumplir.
 * Cada quien agrega la rama de su modulo con su roleGuard.
 */
export const routes: Routes = [
  {
    path: 'login',
    component: PublicShell,
    children: [
      {
        path: '',
        loadComponent: () => import('./modules/auth/pages/login.page').then((m) => m.LoginPage),
      },
    ],
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./modules/home/pages/home.page').then((m) => m.HomePage),
      },
      {
        path: 'personal',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/staff/pages/staff-list.page').then((m) => m.StaffListPage),
      },
      {
        path: 'personal/nuevo',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/staff/pages/staff-form.page').then((m) => m.StaffFormPage),
      },
      {
        path: 'personal/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/staff/pages/staff-form.page').then((m) => m.StaffFormPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
