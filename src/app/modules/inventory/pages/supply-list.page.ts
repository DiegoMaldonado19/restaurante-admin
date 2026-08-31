import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency } from '../../../core/format';
import { InventoryService } from '../inventory.service';
import { MEASURE_UNIT_SYMBOLS, SupplyView } from '../inventory.types';

@Component({
  selector: 'app-supply-list',
  imports: [RouterLink],
  template: `
    <section class="space-y-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-slate-900">Insumos</h1>
        <div class="flex gap-2">
          <a routerLink="/inventario/categorias" class="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Categorias
          </a>
          <a routerLink="/inventario/kardex" class="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Kardex
          </a>
          <a
            routerLink="/inventario/nuevo"
            class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Nuevo insumo
          </a>
        </div>
      </header>

      <div class="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow">
        <input
          type="search"
          placeholder="Nombre del insumo"
          [value]="inventory.search()"
          (input)="inventory.search.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          [value]="inventory.categoryFilter()"
          (change)="inventory.categoryFilter.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las categorias</option>
          @for (category of inventory.categories.value() ?? []; track category.supply_category_id) {
            <option [value]="category.supply_category_id">{{ category.name }}</option>
          }
        </select>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            [checked]="inventory.lowStockOnly()"
            (change)="inventory.lowStockOnly.set($any($event.target).checked)"
            class="rounded border-slate-300"
          />
          Solo bajo el minimo
        </label>

        <div class="ml-auto flex gap-2">
          <a routerLink="/inventario/entradas" class="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white">
            Entrada
          </a>
          <a routerLink="/inventario/mermas" class="rounded-md bg-amber-600 px-3 py-2 text-sm text-white">
            Merma
          </a>
          <a routerLink="/inventario/ajustes" class="rounded-md bg-slate-600 px-3 py-2 text-sm text-white">
            Ajuste
          </a>
        </div>
      </div>

      @if (feedback(); as message) {
        <p role="alert" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ message }}</p>
      }

      @if (inventory.supplies.isLoading()) {
        <p class="text-slate-500">Cargando insumos...</p>
      } @else if (inventory.supplies.error()) {
        <p class="text-red-600">{{ errorMessage() }}</p>
      } @else {
        <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3">Insumo</th>
              <th class="px-4 py-3">Categoria</th>
              <th class="px-4 py-3 text-right">Existencia</th>
              <th class="px-4 py-3 text-right">Minimo</th>
              <th class="px-4 py-3 text-right">Costo unitario</th>
              <th class="px-4 py-3 text-right">Valor</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (supply of inventory.supplies.value()?.content ?? []; track supply.supply_id) {
              <tr class="border-t border-slate-100" [class.bg-amber-50]="supply.low_stock">
                <td class="px-4 py-3 font-medium">{{ supply.name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ supply.category_name }}</td>
                <td class="px-4 py-3 text-right">
                  {{ supply.current_stock }} {{ symbols[supply.measure_unit] }}
                  @if (supply.low_stock) {
                    <span class="ml-2 rounded-full bg-amber-200 px-2 py-1 text-xs text-amber-900">
                      Bajo minimo
                    </span>
                  }
                </td>
                <td class="px-4 py-3 text-right text-slate-500">{{ supply.min_stock }}</td>
                <td class="px-4 py-3 text-right">{{ asCurrency(supply.unit_cost) }}</td>
                <td class="px-4 py-3 text-right">{{ asCurrency(supply.stock_value) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [class]="
                      supply.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    "
                  >
                    {{ supply.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="space-x-3 px-4 py-3">
                  <a [routerLink]="['/inventario', supply.supply_id]" class="text-slate-900 underline">
                    Editar
                  </a>
                  <button type="button" (click)="toggleStatus(supply)" class="text-slate-900 underline">
                    {{ supply.active ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="px-4 py-6 text-center text-slate-500">
                  No hay insumos que coincidan con el filtro.
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class SupplyListPage {
  protected readonly inventory = inject(InventoryService);

  protected readonly symbols = MEASURE_UNIT_SYMBOLS;
  protected readonly asCurrency = formatCurrency;

  protected readonly feedback = signal<string | null>(null);

  protected errorMessage(): string {
    return messageFor(this.inventory.supplies.error());
  }

  /**
   * Desactivar un insumo siempre se permite: deja de tener saldo utilizable y los
   * platillos de cuya receta forma parte quedan no disponibles solos.
   */
  protected async toggleStatus(supply: SupplyView): Promise<void> {
    this.feedback.set(null);

    try {
      await this.inventory.changeStatus(supply.supply_id, !supply.active);
      this.inventory.supplies.reload();
    } catch (error) {
      this.feedback.set(messageFor(error));
    }
  }
}
