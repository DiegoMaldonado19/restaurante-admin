import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import { UserView } from '../staff/staff.types';
import { Paged } from '../../core/paged';
import { REPORT_SPECS, ReportRow, ReportSpec } from './reports.types';

/** Ultimos 30 dias: es el rango con el que casi siempre se abre un reporte. */
function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 29);

  return date.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Los dos formatos de descarga que aceptan los nueve reportes. */
export type ExportFormat = 'csv' | 'xlsx';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly selectedKey = signal(REPORT_SPECS[0].key);

  readonly from = signal(defaultFrom());
  readonly to = signal(today());
  readonly groupBy = signal<'day' | 'week' | 'month'>('day');
  readonly order = signal<'top' | 'bottom'>('top');
  readonly limit = signal(10);
  readonly dishCategoryId = signal<number | ''>('');
  readonly supplyCategoryId = signal<number | ''>('');
  readonly waiterId = signal<number | ''>('');
  readonly zone = signal<'' | 'SALON' | 'TERRACE' | 'BAR'>('');
  readonly lowStockOnly = signal(false);

  readonly spec = computed<ReportSpec>(
    () => REPORT_SPECS.find((item) => item.key === this.selectedKey()) ?? REPORT_SPECS[0],
  );

  /**
   * Se re-pide solo cuando cambia el reporte elegido o alguno de los filtros que ese
   * reporte declara. La guardia de navegador es obligatoria: la ruta se prerenderiza y
   * en el servidor no hay token que mandar.
   */
  readonly rows = httpResource<ReportRow[]>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/reports/${this.query()}` : undefined),
    { defaultValue: [] },
  );

  /** Los meseros del selector. Aparte de StaffService para no tocar sus filtros. */
  readonly waiters = httpResource<Paged<UserView>>(
    () =>
      this.isBrowser
        ? `${this.api.apiBaseUrl}/api/v1/users?role=WAITER&status=ACTIVE&size=100`
        : undefined,
    { defaultValue: { content: [], page: { size: 0, number: 0, total_elements: 0, total_pages: 0 } } },
  );

  /**
   * Descarga con HttpClient y no con un enlace directo: el endpoint exige la cabecera
   * Authorization, que un <a href> no puede mandar.
   */
  async download(format: ExportFormat): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.api.apiBaseUrl}/api/v1/reports/${this.query(format)}`, {
        responseType: 'blob',
      }),
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${this.selectedKey()}-${this.from()}-${this.to()}.${format}`;
    link.click();

    URL.revokeObjectURL(url);
  }

  /** Arma la ruta con los filtros que el reporte elegido declara, y solo con esos. */
  private query(format?: ExportFormat): string {
    const spec = this.spec();
    const params = new URLSearchParams();

    if (spec.filters.includes('range')) {
      params.set('from', this.from());
      params.set('to', this.to());
    }
    if (spec.filters.includes('group_by')) params.set('group_by', this.groupBy());
    if (spec.filters.includes('order')) params.set('order', this.order());
    if (spec.filters.includes('limit')) params.set('limit', String(this.limit()));
    if (spec.filters.includes('dish_category') && this.dishCategoryId() !== '') {
      params.set('category_id', String(this.dishCategoryId()));
    }
    if (spec.filters.includes('supply_category') && this.supplyCategoryId() !== '') {
      params.set('category_id', String(this.supplyCategoryId()));
    }
    if (spec.filters.includes('waiter') && this.waiterId() !== '') {
      params.set('waiter_id', String(this.waiterId()));
    }
    if (spec.filters.includes('zone') && this.zone() !== '') params.set('zone', this.zone());
    if (spec.filters.includes('low_stock_only') && this.lowStockOnly()) {
      params.set('low_stock_only', 'true');
    }
    if (format) params.set('format', format);

    return `${spec.key}?${params.toString()}`;
  }
}
