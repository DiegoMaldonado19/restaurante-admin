import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { ReportsService } from '../reports.service';
import { InventoryService } from '../../inventory/inventory.service';
import { MenuService } from '../../menu/menu.service';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency, formatDateTime } from '../../../core/format';
import { ColumnFormat, REPORT_SPECS, ReportChart, ReportRow, ZONE_LABELS } from '../reports.types';

/**
 * Una sola pantalla para los nueve reportes: el catalogo REPORT_SPECS decide que filtros
 * se pintan, que columnas lleva la tabla y que grafica corresponde.
 *
 * Chart.js se importa y se instancia dentro de afterNextRender. El build de CI
 * prerenderiza, y un `document` fuera de ahi no rompe esta pantalla: rompe el despliegue
 * de los tres repositorios.
 */
@Component({
  selector: 'app-reports',
  template: `
    <section class="print-sheet">
      <header class="mb-6 flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">{{ reports.spec().label }}</h1>
          <p class="mt-1 text-sm text-slate-600">{{ reports.spec().description }}</p>
        </div>
        <div class="no-print flex gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            (click)="print()"
          >
            Imprimir / PDF
          </button>
          <button
            type="button"
            class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-40"
            [disabled]="downloading()"
            (click)="exportCsv()"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      <div class="no-print mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow">
        <label class="block">
          <span class="text-xs text-slate-500">Reporte</span>
          <select
            class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
            [value]="reports.selectedKey()"
            (change)="reports.selectedKey.set($any($event.target).value)"
          >
            @for (item of specs; track item.key) {
              <option [value]="item.key">{{ item.label }}</option>
            }
          </select>
        </label>

        @if (has('range')) {
          <label class="block">
            <span class="text-xs text-slate-500">Desde</span>
            <input
              type="date"
              class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.from()"
              (change)="reports.from.set($any($event.target).value)"
            />
          </label>
          <label class="block">
            <span class="text-xs text-slate-500">Hasta</span>
            <input
              type="date"
              class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.to()"
              (change)="reports.to.set($any($event.target).value)"
            />
          </label>
        }

        @if (has('group_by')) {
          <label class="block">
            <span class="text-xs text-slate-500">Agrupar por</span>
            <select
              class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.groupBy()"
              (change)="reports.groupBy.set($any($event.target).value)"
            >
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </select>
          </label>
        }

        @if (has('order')) {
          <label class="block">
            <span class="text-xs text-slate-500">Orden</span>
            <select
              class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.order()"
              (change)="reports.order.set($any($event.target).value)"
            >
              <option value="top">Mas vendidos</option>
              <option value="bottom">Menos vendidos</option>
            </select>
          </label>
        }

        @if (has('limit')) {
          <label class="block">
            <span class="text-xs text-slate-500">Cuantos</span>
            <input
              type="number"
              min="1"
              max="100"
              class="mt-1 block w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.limit()"
              (change)="reports.limit.set(+$any($event.target).value || 10)"
            />
          </label>
        }

        @if (has('dish_category')) {
          <label class="block">
            <span class="text-xs text-slate-500">Categoria</span>
            <select
              class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.dishCategoryId()"
              (change)="reports.dishCategoryId.set(asId($any($event.target).value))"
            >
              <option value="">Todas</option>
              @for (category of menu.categories.value() ?? []; track category.dish_category_id) {
                <option [value]="category.dish_category_id">{{ category.name }}</option>
              }
            </select>
          </label>
        }

        @if (has('supply_category')) {
          <label class="block">
            <span class="text-xs text-slate-500">Categoria</span>
            <select
              class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.supplyCategoryId()"
              (change)="reports.supplyCategoryId.set(asId($any($event.target).value))"
            >
              <option value="">Todas</option>
              @for (category of inventory.categories.value() ?? []; track category.supply_category_id) {
                <option [value]="category.supply_category_id">{{ category.name }}</option>
              }
            </select>
          </label>
        }

        @if (has('waiter')) {
          <label class="block">
            <span class="text-xs text-slate-500">Mesero</span>
            <select
              class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.waiterId()"
              (change)="reports.waiterId.set(asId($any($event.target).value))"
            >
              <option value="">Todos</option>
              @for (waiter of reports.waiters.value().content; track waiter.user_id) {
                <option [value]="waiter.user_id">{{ waiter.full_name }}</option>
              }
            </select>
          </label>
        }

        @if (has('zone')) {
          <label class="block">
            <span class="text-xs text-slate-500">Zona</span>
            <select
              class="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
              [value]="reports.zone()"
              (change)="reports.zone.set($any($event.target).value)"
            >
              <option value="">Todas</option>
              @for (zone of zones; track zone) {
                <option [value]="zone">{{ zoneLabels[zone] }}</option>
              }
            </select>
          </label>
        }

        @if (has('low_stock_only')) {
          <label class="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              [checked]="reports.lowStockOnly()"
              (change)="reports.lowStockOnly.set($any($event.target).checked)"
            />
            Solo bajo minimo
          </label>
        }
      </div>

      @if (feedback(); as message) {
        <p role="alert" class="no-print mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {{ message }}
        </p>
      }

      @if (reports.rows.isLoading()) {
        <p class="text-slate-500">Calculando el reporte...</p>
      } @else if (reports.rows.error()) {
        <p class="text-red-600">{{ errorMessage() }}</p>
      } @else {
        @if (reports.spec().chart && reports.rows.value().length) {
          <div class="mb-6 rounded-lg bg-white p-4 shadow">
            <canvas #chartCanvas height="90"></canvas>
          </div>
        }

        <div class="overflow-x-auto rounded-lg bg-white shadow">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left text-slate-600">
              <tr>
                @for (column of reports.spec().columns; track column.key) {
                  <th class="px-3 py-2 font-medium">{{ column.label }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of reports.rows.value(); track $index) {
                <tr class="border-t border-slate-100">
                  @for (column of reports.spec().columns; track column.key) {
                    <td class="px-3 py-2 text-slate-800">{{ cell(row, column.key, column.format) }}</td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td class="px-3 py-6 text-slate-500" [attr.colspan]="reports.spec().columns.length">
                    El reporte no devolvio filas para estos filtros.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class ReportsPage implements OnDestroy {
  protected readonly reports = inject(ReportsService);
  protected readonly menu = inject(MenuService);
  protected readonly inventory = inject(InventoryService);

  protected readonly specs = REPORT_SPECS;
  protected readonly zones = ['SALON', 'TERRACE', 'BAR'];
  protected readonly zoneLabels = ZONE_LABELS;

  protected readonly feedback = signal<string | null>(null);
  protected readonly downloading = signal(false);

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private readonly ready = signal(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chartLib: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chart: any = null;

  constructor() {
    // Import dinamico: asi chart.js no se carga siquiera durante el prerenderizado.
    afterNextRender(async () => {
      this.chartLib = (await import('chart.js/auto')).default;
      this.ready.set(true);
    });

    // Lee el canvas dentro del efecto para reaccionar tambien a su aparicion y a su
    // desaparicion cuando el reporte elegido no lleva grafica.
    effect(() => {
      const canvasRef = this.canvas();
      const rows = this.reports.rows.value();
      const chart = this.reports.spec().chart;

      if (!this.ready() || !canvasRef || !chart || !rows.length) {
        this.destroyChart();
        return;
      }

      this.draw(canvasRef.nativeElement, rows, chart);
    });
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  protected has(filter: string): boolean {
    return this.reports.spec().filters.includes(filter as never);
  }

  protected asId(value: string): number | '' {
    return value === '' ? '' : Number(value);
  }

  protected errorMessage(): string {
    return messageFor(this.reports.rows.error());
  }

  protected cell(row: ReportRow, key: string, format: ColumnFormat): string {
    const value = row[key];

    if (value === null || value === undefined) return '—';

    switch (format) {
      case 'money':
        return formatCurrency(Number(value));
      case 'percent':
        return `${Number(value).toFixed(1)} %`;
      case 'decimal':
        return Number(value).toFixed(2);
      case 'minutes':
        return `${Math.round(Number(value))} min`;
      case 'date':
        return formatDateTime(String(value));
      default:
        return String(value);
    }
  }

  protected async exportCsv(): Promise<void> {
    this.downloading.set(true);
    this.feedback.set(null);

    try {
      await this.reports.downloadCsv();
    } catch (error) {
      this.feedback.set(messageFor(error));
    } finally {
      this.downloading.set(false);
    }
  }

  /** Ya estamos en el navegador: el PDF lo genera la hoja @media print de print.css. */
  protected print(): void {
    window.print();
  }

  private draw(canvas: HTMLCanvasElement, rows: ReportRow[], spec: ReportChart): void {
    this.destroyChart();

    this.chart = new this.chartLib(canvas, {
      type: spec.type,
      data: {
        labels: rows.map((row) => String(row[spec.labelKey] ?? '')),
        datasets: [
          {
            label: spec.valueLabel,
            data: rows.map((row) => Number(row[spec.valueKey] ?? 0)),
            borderColor: '#0f172a',
            backgroundColor: '#64748b',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
