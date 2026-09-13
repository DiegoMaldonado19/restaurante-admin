import { Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ApiConfig } from '../../../api-config';
import { DiningService } from '../../dining/dining.service';
import { Paged } from '../../../core/paged';
import { SupplyView } from '../../inventory/inventory.types';
import { formatCurrency } from '../../../core/format';
import { SalesRow } from '../../reports/reports.types';

/**
 * Panel del administrador: ventas del dia, insumos bajo minimo y ocupacion actual.
 *
 * Solo las ventas necesitan el modulo de reportes. La ocupacion reusa el plano de mesas
 * que dining ya sirve, y el stock bajo sale del catalogo de insumos: ningun endpoint
 * nuevo se escribio para esta pantalla.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section>
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">Hola, {{ auth.fullName() }}</h1>
        <p class="mt-1 text-slate-600">Resumen de hoy</p>
      </header>

      <div class="grid gap-4 sm:grid-cols-3">
        <a routerLink="/reportes" class="rounded-xl bg-white p-6 shadow hover:shadow-md transition-shadow">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-500">Ventas de hoy</p>
          @if (salesToday.isLoading()) {
            <p class="mt-2 text-slate-400">...</p>
          } @else {
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ todaySales() }}</p>
            <p class="mt-1 text-sm text-slate-500">{{ todayInvoices() }} facturas</p>
          }
        </a>

        <a routerLink="/inventario" class="rounded-xl bg-white p-6 shadow hover:shadow-md transition-shadow">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-500">Insumos bajo minimo</p>
          @if (lowStock.isLoading()) {
            <p class="mt-2 text-slate-400">...</p>
          } @else {
            <p class="mt-2 text-3xl font-semibold" [class]="lowStockCount() ? 'text-amber-600' : 'text-slate-900'">
              {{ lowStockCount() }}
            </p>
            <p class="mt-1 text-sm text-slate-500">
              {{ lowStockCount() ? 'Requieren reposicion' : 'Todo por encima del minimo' }}
            </p>
          }
        </a>

        <a routerLink="/salon" class="rounded-xl bg-white p-6 shadow hover:shadow-md transition-shadow">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-500">Mesas ocupadas</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900">
            {{ occupiedTables() }}<span class="text-lg text-slate-400">/{{ totalTables() }}</span>
          </p>
          <p class="mt-1 text-sm text-slate-500">{{ freeTables() }} libres ahora</p>
        </a>
      </div>
    </section>
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  protected readonly dining = inject(DiningService);

  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** La ruta '' se prerenderiza, asi que en el servidor no se pide nada. */
  protected readonly salesToday = httpResource<SalesRow[]>(
    () => {
      if (!this.isBrowser) return undefined;

      const day = new Date().toISOString().slice(0, 10);

      return `${this.api.apiBaseUrl}/api/v1/reports/sales?from=${day}&to=${day}&group_by=day`;
    },
    { defaultValue: [] },
  );

  protected readonly todaySales = computed(() =>
    formatCurrency(this.salesToday.value().reduce((total, row) => total + row.sales, 0)),
  );

  protected readonly todayInvoices = computed(() =>
    this.salesToday.value().reduce((total, row) => total + row.invoices, 0),
  );

  /**
   * Peticion propia y no InventoryService.supplies: ese recurso lleva los filtros de la
   * pantalla de inventario y solo trae la primera pagina, asi que el conteo saldria mal.
   * total_elements da la cifra exacta sin descargar el catalogo entero.
   */
  protected readonly lowStock = httpResource<Paged<SupplyView>>(
    () =>
      this.isBrowser
        ? `${this.api.apiBaseUrl}/api/v1/supplies?low_stock=true&active=true&size=1`
        : undefined,
    { defaultValue: { content: [], page: { size: 0, number: 0, total_elements: 0, total_pages: 0 } } },
  );

  protected readonly lowStockCount = computed(() => this.lowStock.value().page.total_elements);

  protected readonly totalTables = computed(() => this.dining.floorPlan.value().length);

  protected readonly occupiedTables = computed(
    () =>
      this.dining.floorPlan
        .value()
        .filter((table) => table.status === 'OCCUPIED' || table.status === 'BILL_REQUESTED').length,
  );

  protected readonly freeTables = computed(
    () => this.dining.floorPlan.value().filter((table) => table.status === 'FREE').length,
  );
}
