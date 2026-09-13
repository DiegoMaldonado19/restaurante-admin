import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency } from '../../../core/format';
import { MenuService } from '../../menu/menu.service';

/**
 * Punto de entrada de recetas: el catalogo de platillos con su precio, para elegir a cual
 * entrarle. Reusa MenuService.dishes con sus filtros; el costo y el margen no salen aqui
 * porque GET /dishes no los trae y pedir la ficha de cada fila serian N peticiones por
 * pagina. Se ven en el editor, que es donde se cambian.
 */
@Component({
  selector: 'app-recipe-list',
  imports: [RouterLink],
  template: `
    <section class="space-y-4">
      <header>
        <h1 class="text-2xl font-semibold text-slate-900">Recetas</h1>
        <p class="mt-1 text-sm text-slate-600">
          Insumos, costo de produccion e historial de versiones por platillo
        </p>
      </header>

      <div class="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow">
        <input
          type="search"
          placeholder="Nombre del platillo"
          [value]="menu.search()"
          (input)="menu.search.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          [value]="menu.categoryFilter()"
          (change)="menu.categoryFilter.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las categorias</option>
          @for (category of categories(); track category.dish_category_id) {
            <option [value]="category.dish_category_id">{{ category.name }}</option>
          }
        </select>
      </div>

      @if (menu.dishes.isLoading()) {
        <p class="text-slate-500">Cargando platillos...</p>
      } @else if (menu.dishes.error()) {
        <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ error() }}
        </p>
      } @else {
        <div class="overflow-x-auto rounded-lg bg-white shadow">
          <table class="w-full text-sm">
            <thead class="border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th class="px-4 py-3 font-medium">Platillo</th>
                <th class="px-4 py-3 font-medium">Categoria</th>
                <th class="px-4 py-3 text-right font-medium">Precio</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (dish of dishes(); track dish.dish_id) {
                <tr class="border-b border-slate-100">
                  <td class="px-4 py-3 text-slate-900">{{ dish.name }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ dish.category_name }}</td>
                  <td class="px-4 py-3 text-right text-slate-900">
                    {{ asCurrency(dish.sale_price) }}
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <a [routerLink]="['/recetas', dish.dish_id]" class="text-slate-900 underline">
                      Receta y costo
                    </a>
                    <a
                      [routerLink]="['/recetas', dish.dish_id, 'versiones']"
                      class="ml-3 text-slate-600 underline"
                    >
                      Historial
                    </a>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-6 text-slate-500">
                    No hay platillos con esos filtros.
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
export class RecipeListPage {
  protected readonly menu = inject(MenuService);
  protected readonly asCurrency = formatCurrency;

  protected readonly dishes = computed(() => this.menu.dishes.value()?.content ?? []);
  protected readonly categories = computed(() => this.menu.categories.value() ?? []);

  protected error(): string {
    return messageFor(this.menu.dishes.error());
  }
}
