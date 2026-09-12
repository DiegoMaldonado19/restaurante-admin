import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency } from '../../../core/format';
import { MenuService } from '../menu.service';
import { DishView } from '../menu.types';

/**
 * Catalogo de platillos. La disponibilidad efectiva (`available`) combina la bandera manual
 * con el stock real; por eso hay tres badges y tres acciones distintas: editar datos, alternar
 * la bandera manual y dar de baja.
 */
@Component({
  selector: 'app-dish-list',
  imports: [RouterLink],
  template: `
    <section class="space-y-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-slate-900">Platillos</h1>
        <div class="flex gap-2">
          <a routerLink="/menu/categorias" class="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Categorias
          </a>
          <a routerLink="/menu/combos" class="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Combos
          </a>
          <a
            routerLink="/menu/nuevo"
            class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Nuevo platillo
          </a>
        </div>
      </header>

      <div class="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow">
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
          @for (category of menu.categories.value() ?? []; track category.dish_category_id) {
            <option [value]="category.dish_category_id">{{ category.name }}</option>
          }
        </select>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            [checked]="menu.activeOnly()"
            (change)="menu.activeOnly.set($any($event.target).checked)"
            class="rounded border-slate-300"
          />
          Solo activos
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            [checked]="menu.availableOnly()"
            (change)="menu.availableOnly.set($any($event.target).checked)"
            class="rounded border-slate-300"
          />
          Solo disponibles
        </label>
      </div>

      @if (menu.availableOnly()) {
        <p class="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          El filtro de disponibilidad se aplica sobre la pagina, asi que el conteo puede diferir del
          total real.
        </p>
      }

      @if (feedback(); as message) {
        <p role="alert" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ message }}</p>
      }

      @if (menu.dishes.isLoading()) {
        <p class="text-slate-500">Cargando platillos...</p>
      } @else if (menu.dishes.error()) {
        <p class="text-red-600">{{ errorMessage() }}</p>
      } @else {
        <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3">Platillo</th>
              <th class="px-4 py-3">Categoria</th>
              <th class="px-4 py-3 text-right">Precio</th>
              <th class="px-4 py-3 text-right">Prep.</th>
              <th class="px-4 py-3">Disponibilidad</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (dish of menu.dishes.value()?.content ?? []; track dish.dish_id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    @if (dish.image_url) {
                      <img
                        [src]="dish.image_url"
                        [alt]="dish.name"
                        class="h-10 w-10 rounded-md object-cover"
                      />
                    }
                    <span class="font-medium">{{ dish.name }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-500">{{ dish.category_name }}</td>
                <td class="px-4 py-3 text-right">{{ asCurrency(dish.sale_price) }}</td>
                <td class="px-4 py-3 text-right text-slate-500">{{ dish.prep_minutes }} min</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2 py-1 text-xs" [class]="availabilityClass(dish)">
                    {{ availabilityLabel(dish) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [class]="
                      dish.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    "
                  >
                    {{ dish.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="space-x-3 px-4 py-3">
                  <a [routerLink]="['/menu', dish.dish_id]" class="text-slate-900 underline">Ver</a>
                  <a [routerLink]="['/menu', dish.dish_id, 'editar']" class="text-slate-900 underline">
                    Editar
                  </a>
                  <button type="button" (click)="toggleAvailability(dish)" class="text-slate-900 underline">
                    {{ dish.manual_available ? 'Marcar no disp.' : 'Marcar disp.' }}
                  </button>
                  @if (dish.active) {
                    <button type="button" (click)="deactivate(dish)" class="text-red-700 underline">
                      Dar de baja
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="px-4 py-6 text-center text-slate-500">
                  No hay platillos que coincidan con el filtro.
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class DishListPage {
  protected readonly menu = inject(MenuService);
  protected readonly asCurrency = formatCurrency;

  protected readonly feedback = signal<string | null>(null);

  protected errorMessage(): string {
    return messageFor(this.menu.dishes.error());
  }

  protected availabilityLabel(dish: DishView): string {
    if (!dish.manual_available) {
      return 'No disponible (manual)';
    }

    return dish.available ? 'Disponible' : 'Sin stock';
  }

  protected availabilityClass(dish: DishView): string {
    if (!dish.manual_available) {
      return 'bg-slate-200 text-slate-600';
    }

    return dish.available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900';
  }

  protected async toggleAvailability(dish: DishView): Promise<void> {
    this.feedback.set(null);

    try {
      await this.menu.changeDishAvailability(dish.dish_id, !dish.manual_available);
      this.menu.dishes.reload();
    } catch (error) {
      this.feedback.set(messageFor(error));
    }
  }

  /** Baja logica. El backend responde 409 DISH_IN_USE si el platillo esta en un combo activo. */
  protected async deactivate(dish: DishView): Promise<void> {
    this.feedback.set(null);

    try {
      await this.menu.deleteDish(dish.dish_id);
      this.menu.dishes.reload();
    } catch (error) {
      this.feedback.set(messageFor(error));
    }
  }
}
