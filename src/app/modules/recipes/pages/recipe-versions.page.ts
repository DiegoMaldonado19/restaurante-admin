import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency, formatDateTime } from '../../../core/format';
import { InventoryService } from '../../inventory/inventory.service';
import { MEASURE_UNIT_SYMBOLS } from '../../inventory/inventory.types';
import { RecipesService } from '../recipes.service';
import { RecipeVersionView } from '../recipes.types';

/**
 * Historial de versiones de la receta. Es lo que sostiene el costo congelado: cada venta
 * se costeo con la version vigente ese dia, y aqui se ve cual era y que insumos llevaba.
 */
@Component({
  selector: 'app-recipe-versions',
  imports: [RouterLink],
  template: `
    <section class="max-w-3xl space-y-4">
      <header class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Historial de la receta</h1>
          <p class="mt-1 text-sm text-slate-600">
            Cada version con su vigencia y el costo con que se costearon sus ventas
          </p>
        </div>
        <a [routerLink]="['/recetas', dishId()]" class="text-sm text-slate-900 underline">
          Editar receta
        </a>
      </header>

      @if (loading()) {
        <p class="text-slate-500">Cargando historial...</p>
      } @else if (failure()) {
        <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ failure() }}</p>
      } @else {
        @for (version of versions(); track version.recipe_id) {
          <article class="rounded-xl bg-white p-6 shadow">
            <header class="flex items-center justify-between">
              <h2 class="font-medium text-slate-900">
                Version {{ version.version }}
                @if (version.current) {
                  <span class="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    Vigente
                  </span>
                }
              </h2>
              <span class="text-sm text-slate-900">{{ asCurrency(version.production_cost) }}</span>
            </header>

            <p class="mt-1 text-sm text-slate-600">
              Desde {{ asDateTime(version.effective_from) }}
              @if (version.effective_to) {
                hasta {{ asDateTime(version.effective_to) }}
              } @else {
                (sin cierre)
              }
            </p>

            <ul class="mt-4 divide-y divide-slate-100 text-sm">
              @for (item of version.items; track item.supply_id) {
                <li class="flex justify-between py-2">
                  <span class="text-slate-700">
                    {{ supplyName(item.supply_id) }} &middot; {{ item.quantity }}
                    {{ supplyUnit(item.supply_id) }}
                  </span>
                  <span class="text-slate-900">{{ asCurrency(item.line_cost) }}</span>
                </li>
              }
            </ul>
          </article>
        } @empty {
          <p class="rounded-xl bg-white p-6 text-slate-500 shadow">
            Este platillo todavia no tiene ninguna version de receta.
          </p>
        }
      }
    </section>
  `,
})
export class RecipeVersionsPage {
  /** Viene de la ruta /recetas/:dishId/versiones. */
  readonly dishId = input.required<string>();

  private readonly recipes = inject(RecipesService);
  private readonly inventory = inject(InventoryService);

  protected readonly asCurrency = formatCurrency;
  protected readonly asDateTime = formatDateTime;

  protected readonly versions = signal<RecipeVersionView[]>([]);
  protected readonly loading = signal(true);
  protected readonly failure = signal<string | null>(null);

  /** El backend manda supply_id; el nombre sale del picker que inventory ya carga. */
  private readonly supplies = computed(
    () => new Map((this.inventory.pickerSupplies.value()?.content ?? []).map((s) => [s.supply_id, s])),
  );

  constructor() {
    void this.load();
  }

  protected supplyName(supplyId: number): string {
    return this.supplies().get(supplyId)?.name ?? `Insumo ${supplyId}`;
  }

  protected supplyUnit(supplyId: number): string {
    const supply = this.supplies().get(supplyId);
    return supply ? MEASURE_UNIT_SYMBOLS[supply.measure_unit] : '';
  }

  private async load(): Promise<void> {
    try {
      this.versions.set(await this.recipes.dishRecipeVersions(Number(this.dishId())));
    } catch (error) {
      this.failure.set(messageFor(error));
    } finally {
      this.loading.set(false);
    }
  }
}
