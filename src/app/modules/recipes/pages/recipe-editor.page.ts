import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency } from '../../../core/format';
import { InventoryService } from '../../inventory/inventory.service';
import { MEASURE_UNIT_SYMBOLS } from '../../inventory/inventory.types';
import { MenuService } from '../../menu/menu.service';
import { DishDetailView, ModifierView } from '../../menu/menu.types';
import { RecipesService } from '../recipes.service';
import { RecipeItemDTO } from '../recipes.types';

/** Lo que se esta editando: la receta del platillo o la de uno de sus modificadores. */
type Target = { kind: 'dish' } | { kind: 'modifier'; id: number; name: string };

/**
 * Editor de receta con su costo y su rentabilidad. Un solo editor de lineas sirve al
 * platillo y a cada modificador: cambia el destino del PUT, no la pantalla.
 *
 * El costo se calcula en vivo con el unit_cost del insumo, como pista mientras se edita;
 * el que manda es el que devuelve el backend al guardar, que es el que congela la venta.
 */
@Component({
  selector: 'app-recipe-editor',
  imports: [RouterLink],
  template: `
    <section class="max-w-3xl space-y-4">
      <header class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">{{ dish()?.name ?? 'Receta' }}</h1>
          <p class="mt-1 text-sm text-slate-600">Insumos, costo de produccion y rentabilidad</p>
        </div>
        <a [routerLink]="['/recetas', dishId(), 'versiones']" class="text-sm text-slate-900 underline">
          Historial de versiones
        </a>
      </header>

      @if (loading()) {
        <p class="text-slate-500">Cargando receta...</p>
      } @else {
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            (click)="selectTarget({ kind: 'dish' })"
            [class]="tabClass(target().kind === 'dish')"
          >
            Platillo
          </button>
          @for (modifier of activeModifiers(); track modifier.dish_modifier_id) {
            <button
              type="button"
              (click)="selectTarget({ kind: 'modifier', id: modifier.dish_modifier_id, name: modifier.name })"
              [class]="tabClass(isSelected(modifier.dish_modifier_id))"
            >
              {{ modifier.name }}
            </button>
          }
        </div>

        <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700">
              Insumos de {{ targetLabel() }}
            </span>
            <button
              type="button"
              (click)="addItem()"
              class="rounded-md border border-slate-300 px-3 py-1 text-sm"
            >
              Agregar insumo
            </button>
          </div>

          @for (item of items(); track $index) {
            <div class="flex items-center gap-2">
              <select
                [value]="item.supply_id"
                (change)="setSupply($index, +$any($event.target).value)"
                class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option [value]="0">Elija un insumo</option>
                @for (supply of supplies(); track supply.supply_id) {
                  <option [value]="supply.supply_id">
                    {{ supply.name }} ({{ asCurrency(supply.unit_cost) }} / {{ unitSymbols[supply.measure_unit] }})
                  </option>
                }
              </select>
              <input
                type="number"
                min="0.001"
                step="0.001"
                [value]="item.quantity"
                (input)="setQuantity($index, +$any($event.target).value)"
                class="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <span class="w-24 text-right text-sm text-slate-600">
                {{ asCurrency(lineCost(item)) }}
              </span>
              <button type="button" (click)="removeItem($index)" class="text-red-700 underline text-sm">
                Quitar
              </button>
            </div>
          } @empty {
            <p class="text-sm text-slate-500">
              La receta necesita al menos un insumo para poder guardarse.
            </p>
          }

          <div class="space-y-1 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p>Costo de produccion: {{ asCurrency(estimatedCost()) }}</p>
            @if (target().kind === 'dish' && dish(); as detail) {
              <p>Precio de venta: {{ asCurrency(detail.sale_price) }}</p>
              <p [class]="margin() >= 0 ? 'text-emerald-700' : 'text-red-600'">
                Margen: {{ asCurrency(margin()) }}
                @if (detail.sale_price > 0) {
                  ({{ marginPercent().toFixed(1) }} %)
                }
              </p>
            }
          </div>

          @if (failure()) {
            <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ failure() }}</p>
          }
          @if (saved()) {
            <p class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Version guardada. Las ventas anteriores conservan su costo.
            </p>
          }

          <div class="flex justify-end gap-2">
            <a routerLink="/recetas" class="px-3 py-2 text-sm">Volver</a>
            <button
              type="submit"
              [disabled]="!isValid() || submitting()"
              class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Guardar version
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class RecipeEditorPage {
  /** Viene de la ruta /recetas/:dishId. */
  readonly dishId = input.required<string>();

  private readonly recipes = inject(RecipesService);
  private readonly menu = inject(MenuService);
  private readonly inventory = inject(InventoryService);

  protected readonly asCurrency = formatCurrency;
  protected readonly unitSymbols = MEASURE_UNIT_SYMBOLS;

  protected readonly dish = signal<DishDetailView | null>(null);
  protected readonly modifiers = signal<ModifierView[]>([]);
  protected readonly target = signal<Target>({ kind: 'dish' });
  protected readonly items = signal<RecipeItemDTO[]>([]);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly saved = signal(false);

  /** GET /dishes/{id}/modifiers devuelve tambien los dados de baja, y esos ya no se venden. */
  protected readonly activeModifiers = computed(() =>
    this.modifiers().filter((modifier) => modifier.active),
  );

  protected readonly supplies = computed(() => this.inventory.pickerSupplies.value()?.content ?? []);

  /** Mapa insumo -> costo unitario, para el calculo en vivo mientras se edita. */
  private readonly unitCosts = computed(
    () => new Map(this.supplies().map((supply) => [supply.supply_id, supply.unit_cost])),
  );

  protected readonly estimatedCost = computed(() =>
    this.items().reduce((total, item) => total + this.lineCost(item), 0),
  );

  protected readonly margin = computed(() => (this.dish()?.sale_price ?? 0) - this.estimatedCost());

  protected readonly marginPercent = computed(() => {
    const price = this.dish()?.sale_price ?? 0;
    return price > 0 ? (this.margin() / price) * 100 : 0;
  });

  protected readonly targetLabel = computed(() => {
    const target = this.target();
    return target.kind === 'dish' ? 'el platillo' : target.name;
  });

  protected readonly isValid = computed(
    () =>
      this.items().length > 0 &&
      this.items().every((item) => item.supply_id > 0 && item.quantity > 0),
  );

  constructor() {
    void this.load();
  }

  protected isSelected(modifierId: number): boolean {
    const target = this.target();
    return target.kind === 'modifier' && target.id === modifierId;
  }

  protected tabClass(active: boolean): string {
    return active
      ? 'rounded-md bg-slate-900 px-3 py-2 text-sm text-white'
      : 'rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700';
  }

  protected lineCost(item: RecipeItemDTO): number {
    return (this.unitCosts().get(item.supply_id) ?? 0) * item.quantity;
  }

  protected addItem(): void {
    this.items.update((list) => [...list, { supply_id: 0, quantity: 1 }]);
  }

  protected removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  protected setSupply(index: number, supplyId: number): void {
    this.items.update((list) =>
      list.map((item, i) => (i === index ? { ...item, supply_id: supplyId } : item)),
    );
  }

  protected setQuantity(index: number, quantity: number): void {
    this.items.update((list) =>
      list.map((item, i) => (i === index ? { ...item, quantity } : item)),
    );
  }

  protected async selectTarget(target: Target): Promise<void> {
    this.target.set(target);
    this.saved.set(false);
    await this.loadRecipeOf(target);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  private async load(): Promise<void> {
    const id = Number(this.dishId());

    try {
      const [detail, modifiers] = await Promise.all([
        this.menu.findDish(id),
        this.menu.modifiersOf(id),
      ]);

      this.dish.set(detail);
      this.modifiers.set(modifiers);
      this.items.set(toItems(detail.recipe?.items));
    } catch (error) {
      this.failure.set(messageFor(error));
    } finally {
      this.loading.set(false);
    }
  }

  /** Un platillo sin receta responde 404: es un caso normal, no un error que mostrar. */
  private async loadRecipeOf(target: Target): Promise<void> {
    this.failure.set(null);

    try {
      const recipe =
        target.kind === 'dish'
          ? await this.recipes.dishRecipe(Number(this.dishId()))
          : await this.recipes.modifierRecipe(target.id);

      this.items.set(toItems(recipe.items));
    } catch {
      this.items.set([]);
    }
  }

  private async save(): Promise<void> {
    this.submitting.set(true);
    this.failure.set(null);
    this.saved.set(false);

    const target = this.target();
    const request = { items: this.items() };

    try {
      if (target.kind === 'dish') {
        await this.recipes.replaceDishRecipe(Number(this.dishId()), request);
        // El costo y el margen los recalcula el backend: se releen, no se adivinan.
        this.dish.set(await this.menu.findDish(Number(this.dishId())));
      } else {
        await this.recipes.replaceModifierRecipe(target.id, request);
      }

      this.saved.set(true);
    } catch (error) {
      this.failure.set(messageFor(error));
    } finally {
      this.submitting.set(false);
    }
  }
}

function toItems(items: { supply_id: number; quantity: number }[] | undefined): RecipeItemDTO[] {
  return (items ?? []).map((item) => ({ supply_id: item.supply_id, quantity: item.quantity }));
}
