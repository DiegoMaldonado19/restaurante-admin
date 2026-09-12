import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { MenuService } from '../menu.service';
import { DishCategoryView } from '../menu.types';

/**
 * Categorias de platillo (entrada, plato fuerte, bebida...). A diferencia de las de insumo,
 * llevan orden de despliegue: es el orden en que se muestran en el menu.
 */
@Component({
  selector: 'app-dish-category',
  imports: [RouterLink],
  template: `
    <section class="max-w-3xl space-y-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-slate-900">Categorias de platillo</h1>
        <a routerLink="/menu" class="text-sm text-slate-600 underline">Volver al catalogo</a>
      </header>

      <form (submit)="onCreate($event)" class="flex flex-wrap items-end gap-2 rounded-lg bg-white p-4 shadow">
        <label class="flex-1">
          <span class="text-sm font-medium text-slate-700">Nombre de la categoria</span>
          <input
            type="text"
            maxlength="60"
            required
            [value]="newName()"
            (input)="newName.set($any($event.target).value)"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label class="w-32">
          <span class="text-sm font-medium text-slate-700">Orden</span>
          <input
            type="number"
            min="0"
            required
            [value]="newOrder()"
            (input)="newOrder.set(+$any($event.target).value)"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          [disabled]="newName().trim().length === 0"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      @if (feedback(); as message) {
        <p role="alert" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ message }}</p>
      }

      @if (menu.categories.isLoading()) {
        <p class="text-slate-500">Cargando categorias...</p>
      } @else if (menu.categories.error()) {
        <p class="text-red-600">{{ errorMessage() }}</p>
      } @else {
        <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3 text-right">Orden</th>
              <th class="px-4 py-3">Categoria</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (category of menu.categories.value() ?? []; track category.dish_category_id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3 text-right text-slate-500">{{ category.display_order }}</td>
                <td class="px-4 py-3 font-medium">{{ category.name }}</td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [class]="
                      category.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    "
                  >
                    {{ category.active ? 'Activa' : 'Dada de baja' }}
                  </span>
                </td>
                <td class="space-x-3 px-4 py-3">
                  <button type="button" (click)="openEdit(category)" class="text-slate-900 underline">
                    Editar
                  </button>
                  @if (category.active) {
                    <button type="button" (click)="deactivate(category)" class="text-slate-900 underline">
                      Dar de baja
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-6 text-center text-slate-500">
                  Todavia no hay categorias.
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      <!-- <dialog> nativo: ya existe, ya es accesible y ya funciona con teclado. -->
      <dialog #editDialog class="rounded-xl p-6 shadow-xl backdrop:bg-slate-900/40">
        <form method="dialog" class="space-y-4" (submit)="confirmEdit()">
          <h2 class="text-lg font-semibold">Editar categoria</h2>
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Nombre</span>
            <input
              type="text"
              maxlength="60"
              required
              [value]="editName()"
              (input)="editName.set($any($event.target).value)"
              class="mt-1 w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Orden de despliegue</span>
            <input
              type="number"
              min="0"
              required
              [value]="editOrder()"
              (input)="editOrder.set(+$any($event.target).value)"
              class="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div class="flex justify-end gap-2">
            <button type="button" (click)="closeEdit()" class="px-3 py-2 text-sm">Cancelar</button>
            <button
              type="submit"
              [disabled]="editName().trim().length === 0"
              class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </form>
      </dialog>
    </section>
  `,
})
export class DishCategoryPage {
  protected readonly menu = inject(MenuService);

  protected readonly newName = signal('');
  protected readonly newOrder = signal(0);

  protected readonly editName = signal('');
  protected readonly editOrder = signal(0);
  protected readonly editTarget = signal<DishCategoryView | null>(null);

  protected readonly feedback = signal<string | null>(null);

  private readonly editDialog = viewChild.required<ElementRef<HTMLDialogElement>>('editDialog');

  protected errorMessage(): string {
    return messageFor(this.menu.categories.error());
  }

  protected async onCreate(event: Event): Promise<void> {
    event.preventDefault();

    await this.run(async () => {
      await this.menu.createCategory({
        name: this.newName().trim(),
        display_order: this.newOrder(),
      });
      this.newName.set('');
      this.newOrder.set(0);
    });
  }

  protected openEdit(category: DishCategoryView): void {
    this.editTarget.set(category);
    this.editName.set(category.name);
    this.editOrder.set(category.display_order);
    this.editDialog().nativeElement.showModal();
  }

  protected closeEdit(): void {
    this.editDialog().nativeElement.close();
  }

  protected async confirmEdit(): Promise<void> {
    const target = this.editTarget();

    if (target === null) {
      return;
    }

    await this.run(() =>
      this.menu.updateCategory(target.dish_category_id, {
        name: this.editName().trim(),
        display_order: this.editOrder(),
      }),
    );
  }

  /** Baja logica: los platillos que la usan la conservan, solo deja de ofrecerse al crear. */
  protected async deactivate(category: DishCategoryView): Promise<void> {
    await this.run(() => this.menu.deactivateCategory(category.dish_category_id));
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.feedback.set(null);

    try {
      await action();
      this.menu.categories.reload();
    } catch (error) {
      // DISH_CATEGORY_NAME_TAKEN llega como 409: el formulario no puede prevenirlo.
      this.feedback.set(messageFor(error));
    }
  }
}
