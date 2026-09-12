import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency } from '../../../core/format';
import { MenuService } from '../menu.service';
import { ComboItemDTO } from '../menu.types';

/**
 * Alta y edicion de combo. El editor de lineas usa senales en vez de Signal Forms porque la
 * composicion es un arreglo dinamico. El ahorro se calcula en vivo como pista al usuario; el
 * backend lo recalcula al guardar. Espeja CreateComboDTO / UpdateComboDTO.
 */
@Component({
  selector: 'app-combo-form',
  template: `
    <section class="max-w-2xl space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">
        {{ isEdit() ? 'Editar combo' : 'Nuevo combo' }}
      </h1>

      <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Nombre</span>
          <input
            type="text"
            maxlength="80"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Descripcion (opcional)</span>
          <textarea
            rows="2"
            maxlength="255"
            [value]="description()"
            (input)="description.set($any($event.target).value)"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          ></textarea>
        </label>

        <label class="block w-48">
          <span class="text-sm font-medium text-slate-700">Precio del combo</span>
          <input
            type="number"
            step="0.01"
            min="0"
            [value]="comboPrice()"
            (input)="comboPrice.set(+$any($event.target).value)"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700">Platillos incluidos</span>
            <button
              type="button"
              (click)="addItem()"
              class="rounded-md border border-slate-300 px-3 py-1 text-sm"
            >
              Agregar platillo
            </button>
          </div>

          @for (item of items(); track $index) {
            <div class="flex items-center gap-2">
              <select
                [value]="item.dish_id"
                (change)="setDish($index, +$any($event.target).value)"
                class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option [value]="0">Elija un platillo</option>
                @for (dish of pickerDishes(); track dish.dish_id) {
                  <option [value]="dish.dish_id">
                    {{ dish.name }} ({{ asCurrency(dish.sale_price) }})
                  </option>
                }
              </select>
              <input
                type="number"
                min="1"
                step="1"
                [value]="item.quantity"
                (input)="setQuantity($index, +$any($event.target).value)"
                class="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="button" (click)="removeItem($index)" class="text-red-700 underline text-sm">
                Quitar
              </button>
            </div>
          } @empty {
            <p class="text-sm text-slate-500">Agregue al menos un platillo al combo.</p>
          }
        </div>

        <div class="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p>Precio suelto: {{ asCurrency(itemsTotal()) }}</p>
          <p [class]="savings() >= 0 ? 'text-emerald-700' : 'text-red-600'">
            Ahorro: {{ asCurrency(savings()) }}
          </p>
        </div>

        @if (failure()) {
          <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ failure() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button type="button" (click)="cancel()" class="px-3 py-2 text-sm">Cancelar</button>
          <button
            type="submit"
            [disabled]="!isValid() || submitting()"
            class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </form>
    </section>
  `,
})
export class ComboFormPage {
  /** Viene de la ruta /menu/combos/:id. Ausente al dar de alta. */
  readonly id = input<string>();

  private readonly menu = inject(MenuService);
  private readonly router = inject(Router);

  protected readonly asCurrency = formatCurrency;

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly failure = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly comboPrice = signal(0);
  protected readonly items = signal<ComboItemDTO[]>([]);

  protected readonly pickerDishes = computed(() => this.menu.dishPicker.value()?.content ?? []);

  /** Suma de los precios sueltos, con los precios que trae el picker. */
  protected readonly itemsTotal = computed(() => {
    const prices = new Map(this.pickerDishes().map((dish) => [dish.dish_id, dish.sale_price]));

    return this.items().reduce(
      (total, item) => total + (prices.get(item.dish_id) ?? 0) * item.quantity,
      0,
    );
  });

  protected readonly savings = computed(() => this.itemsTotal() - this.comboPrice());

  protected readonly isValid = computed(
    () =>
      this.name().trim().length > 0 &&
      this.comboPrice() >= 0 &&
      this.items().length > 0 &&
      this.items().every((item) => item.dish_id > 0 && item.quantity > 0),
  );

  constructor() {
    void this.loadWhenEditing();
  }

  protected addItem(): void {
    this.items.update((list) => [...list, { dish_id: 0, quantity: 1 }]);
  }

  protected removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  protected setDish(index: number, dishId: number): void {
    this.items.update((list) => list.map((item, i) => (i === index ? { ...item, dish_id: dishId } : item)));
  }

  protected setQuantity(index: number, quantity: number): void {
    this.items.update((list) =>
      list.map((item, i) => (i === index ? { ...item, quantity } : item)),
    );
  }

  protected cancel(): void {
    this.router.navigate(['/menu/combos']);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.failure.set(null);

    if (!this.isValid()) {
      return;
    }

    this.submitting.set(true);

    const body = {
      name: this.name().trim(),
      description: this.description().trim() || null,
      combo_price: this.comboPrice(),
      items: this.items(),
    };

    try {
      const comboId = this.id();

      if (comboId !== undefined) {
        await this.menu.updateCombo(Number(comboId), body);
      } else {
        await this.menu.createCombo(body);
      }

      this.menu.combos.reload();
      await this.router.navigate(['/menu/combos']);
    } catch (error) {
      // COMBO_NAME_TAKEN (409) y DISH_NOT_FOUND (404): el formulario no puede prevenirlos.
      this.failure.set(messageFor(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadWhenEditing(): Promise<void> {
    const comboId = this.id();

    if (comboId === undefined) {
      return;
    }

    try {
      const combo = await this.menu.findCombo(Number(comboId));

      this.name.set(combo.name);
      this.description.set(combo.description ?? '');
      this.comboPrice.set(combo.combo_price);
      this.items.set(combo.items.map((item) => ({ dish_id: item.dish_id, quantity: item.quantity })));
    } catch (error) {
      this.failure.set(messageFor(error));
    }
  }
}
