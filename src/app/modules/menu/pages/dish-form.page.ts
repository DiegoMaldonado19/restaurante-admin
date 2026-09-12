import { Component, computed, inject, input, signal } from '@angular/core';
import { form, FormField, maxLength, min, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { MenuService } from '../menu.service';

interface DishModel {
  dish_category_id: string;
  name: string;
  description: string;
  sale_price: number;
  image_url: string;
  prep_minutes: number;
}

/**
 * Alta y edicion de platillo en una sola pantalla. No incluye la disponibilidad manual ni el
 * estado: cada uno tiene su propio endpoint y se maneja desde la lista o la ficha. Las
 * validaciones espejan CreateDishDTO / UpdateDishDTO.
 */
@Component({
  selector: 'app-dish-form',
  imports: [FormField],
  template: `
    <section class="max-w-lg space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">
        {{ isEdit() ? 'Editar platillo' : 'Nuevo platillo' }}
      </h1>

      <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Nombre</span>
          <input
            type="text"
            [formField]="dishForm.name"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (dishForm.name().touched() && dishForm.name().invalid()) {
            @for (error of dishForm.name().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Categoria</span>
          <select
            [formField]="dishForm.dish_category_id"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Elija una categoria</option>
            @for (category of activeCategories(); track category.dish_category_id) {
              <option [value]="category.dish_category_id">{{ category.name }}</option>
            }
          </select>
          @if (dishForm.dish_category_id().touched() && dishForm.dish_category_id().invalid()) {
            @for (error of dishForm.dish_category_id().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Descripcion (opcional)</span>
          <textarea
            rows="3"
            [formField]="dishForm.description"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          ></textarea>
          @if (dishForm.description().touched() && dishForm.description().invalid()) {
            @for (error of dishForm.description().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Precio de venta</span>
            <input
              type="number"
              step="0.01"
              [formField]="dishForm.sale_price"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (dishForm.sale_price().touched() && dishForm.sale_price().invalid()) {
              @for (error of dishForm.sale_price().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Tiempo de preparacion (min)</span>
            <input
              type="number"
              step="1"
              [formField]="dishForm.prep_minutes"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (dishForm.prep_minutes().touched() && dishForm.prep_minutes().invalid()) {
              @for (error of dishForm.prep_minutes().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>
        </div>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">URL de la imagen (opcional)</span>
          <input
            type="url"
            [formField]="dishForm.image_url"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (dishForm.image_url().touched() && dishForm.image_url().invalid()) {
            @for (error of dishForm.image_url().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        @if (model().image_url.trim()) {
          <img
            [src]="model().image_url"
            alt="Vista previa"
            class="h-32 w-32 rounded-md object-cover"
          />
        }

        @if (failure()) {
          <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ failure() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button type="button" (click)="cancel()" class="px-3 py-2 text-sm">Cancelar</button>
          <button
            type="submit"
            [disabled]="dishForm().invalid() || dishForm().submitting()"
            class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </form>
    </section>
  `,
})
export class DishFormPage {
  /** Viene de la ruta /menu/:id/editar. Ausente al dar de alta. */
  readonly id = input<string>();

  private readonly menu = inject(MenuService);
  private readonly router = inject(Router);

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly failure = signal<string | null>(null);

  /** Una categoria dada de baja se conserva en los platillos que la usan, pero ya no se ofrece. */
  protected readonly activeCategories = computed(() =>
    (this.menu.categories.value() ?? []).filter((category) => category.active),
  );

  protected readonly model = signal<DishModel>({
    dish_category_id: '',
    name: '',
    description: '',
    sale_price: 0,
    image_url: '',
    prep_minutes: 0,
  });

  protected readonly dishForm = form(this.model, (path) => {
    required(path.name, { message: 'El nombre del platillo es obligatorio' });
    maxLength(path.name, 80, { message: 'El nombre no puede pasar de 80 caracteres' });

    required(path.dish_category_id, { message: 'Elija una categoria' });

    maxLength(path.description, 255, { message: 'La descripcion no puede pasar de 255 caracteres' });

    required(path.sale_price, { message: 'El precio de venta es obligatorio' });
    min(path.sale_price, 0, { message: 'El precio de venta no puede ser negativo' });

    maxLength(path.image_url, 255, { message: 'La URL no puede pasar de 255 caracteres' });

    required(path.prep_minutes, { message: 'El tiempo de preparacion es obligatorio' });
    min(path.prep_minutes, 0, { message: 'El tiempo de preparacion no puede ser negativo' });
  });

  constructor() {
    void this.loadWhenEditing();
  }

  protected cancel(): void {
    this.router.navigate(['/menu']);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.failure.set(null);

    submit(this.dishForm, {
      action: async () => {
        const value = this.model();
        const body = {
          dish_category_id: Number(value.dish_category_id),
          name: value.name.trim(),
          description: value.description.trim() || null,
          sale_price: Number(value.sale_price),
          image_url: value.image_url.trim() || null,
          prep_minutes: Number(value.prep_minutes),
        };

        try {
          const dishId = this.id();

          if (dishId !== undefined) {
            await this.menu.updateDish(Number(dishId), body);
          } else {
            await this.menu.createDish(body);
          }

          this.menu.dishes.reload();
          await this.router.navigate(['/menu']);
        } catch (error) {
          // DISH_NAME_TAKEN llega como 409: el formulario no puede prevenirlo.
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }

  private async loadWhenEditing(): Promise<void> {
    const dishId = this.id();

    if (dishId === undefined) {
      return;
    }

    try {
      const dish = await this.menu.findDish(Number(dishId));

      this.model.set({
        dish_category_id: String(dish.dish_category_id),
        name: dish.name,
        description: dish.description ?? '',
        sale_price: dish.sale_price,
        image_url: dish.image_url ?? '',
        prep_minutes: dish.prep_minutes,
      });
    } catch (error) {
      this.failure.set(messageFor(error));
    }
  }
}
