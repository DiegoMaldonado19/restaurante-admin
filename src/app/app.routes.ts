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
      {
        path: 'inventario',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/inventory/pages/supply-list.page').then((m) => m.SupplyListPage),
      },
      {
        path: 'inventario/nuevo',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/inventory/pages/supply-form.page').then((m) => m.SupplyFormPage),
      },
      {
        path: 'inventario/entradas',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/inventory/pages/stock-entry.page').then((m) => m.StockEntryPage),
      },
      {
        path: 'inventario/mermas',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/inventory/pages/stock-waste.page').then((m) => m.StockWastePage),
      },
      {
        path: 'inventario/ajustes',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/inventory/pages/stock-adjustment.page').then((m) => m.StockAdjustmentPage),
      },
      {
        path: 'inventario/kardex',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/inventory/pages/kardex.page').then((m) => m.KardexPage),
      },
      {
        path: 'inventario/categorias',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/inventory/pages/supply-category.page').then((m) => m.SupplyCategoryPage),
      },
      // Va al final de la rama: si estuviera antes, capturaria /inventario/nuevo como :id.
      {
        path: 'inventario/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/inventory/pages/supply-form.page').then((m) => m.SupplyFormPage),
      },
      {
        path: 'clientes',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/customers/pages/customer-list.page').then((m) => m.CustomerListPage),
      },
      {
        path: 'clientes/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./modules/customers/pages/customer-detail.page').then((m) => m.CustomerDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
