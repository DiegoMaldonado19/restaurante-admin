import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency } from '../../../core/format';
import { MenuService } from '../menu.service';
import { DishDetailView, ModifierView } from '../menu.types';

/**
 * Ficha del platillo: datos, costo de produccion y margen (lectura; se editan en `recipes`),
 * la receta vigente en lectura, y la gestion de modificadores, que son propios de este modulo
 * y cuelgan del platillo (no tienen catalogo global).
 */
@Component({
  selector: 'app-dish-detail',
  imports: [RouterLink],
  template: `
    <section class="max-w-3xl space-y-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-slate-900">{{ dish()?.name ?? 'Platillo' }}</h1>
        <div class="flex gap-2">
          <a routerLink="/menu" class="text-sm text-slate-600 underline">Volver al catalogo</a>
          @if (dish(); as detail) {
            <a
              [routerLink]="['/menu', detail.dish_id, 'editar']"
              class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Editar
            </a>
          }
        </div>
      </header>

      @if (failure()) {
        <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ failure() }}</p>
      }

      @if (dish(); as detail) {
        @if (detail.description) {
          <p class="text-slate-600">{{ detail.description }}</p>
        }

        <div class="grid grid-cols-4 gap-4">
          <div class="rounded-xl bg-white p-4 shadow">
            <p class="text-sm text-slate-500">Precio de venta</p>
            <p class="text-2xl font-semibold text-slate-900">{{ asCurrency(detail.sale_price) }}</p>
          </div>
          <div class="rounded-xl bg-white p-4 shadow">
            <p class="text-sm text-slate-500">Costo de produccion</p>
            <p class="text-2xl font-semibold text-slate-900">
              {{ detail.production_cost === null ? '—' : asCurrency(detail.production_cost) }}
            </p>
          </div>
          <div class="rounded-xl bg-white p-4 shadow">
            <p class="text-sm text-slate-500">Margen</p>
            <p class="text-2xl font-semibold text-slate-900">
              {{ detail.margin_percent === null ? '—' : detail.margin_percent + '%' }}
            </p>
          </div>
          <div class="rounded-xl bg-white p-4 shadow">
            <p class="text-sm text-slate-500">Disponibilidad</p>
            <p class="text-lg font-medium" [class]="detail.available ? 'text-emerald-700' : 'text-amber-700'">
              {{ detail.available ? 'Disponible' : 'No disponible' }}
            </p>
          </div>
        </div>

        <!-- Receta: lectura. Su edicion pertenece al modulo de Recetas. -->

        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-slate-900">Receta vigente</h2>
          @if (detail.recipe; as recipe) {
            <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
              <thead class="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th class="px-4 py-3">Insumo</th>
                  <th class="px-4 py-3 text-right">Cantidad</th>
                  <th class="px-4 py-3 text-right">Costo unitario</th>
                  <th class="px-4 py-3 text-right">Costo linea</th>
                </tr>
              </thead>
              <tbody>
                @for (item of recipe.items; track item.supply_id) {
                  <tr class="border-t border-slate-100">
                    <td class="px-4 py-3">#{{ item.supply_id }}</td>
                    <td class="px-4 py-3 text-right">{{ item.quantity }}</td>
                    <td class="px-4 py-3 text-right">{{ asCurrency(item.unit_cost) }}</td>
                    <td class="px-4 py-3 text-right">{{ asCurrency(item.line_cost) }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="border-t border-slate-200 font-medium">
                  <td class="px-4 py-3" colspan="3">Costo de produccion</td>
                  <td class="px-4 py-3 text-right">{{ asCurrency(recipe.production_cost) }}</td>
                </tr>
              </tfoot>
            </table>
            <p class="text-xs text-slate-500">
              Version {{ recipe.version }}. La receta y el costo se editan en el modulo de Recetas.
            </p>
          } @else {
            <p class="rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-800">
              Este platillo aun no tiene receta vigente, por lo que su costo esta indefinido. Definala en
              el modulo de Recetas.
            </p>
          }
        </div>

        <!-- Modificadores: propios de este modulo. -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900">Modificadores</h2>
            <button
              type="button"
              (click)="openCreate()"
              class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            >
              Nuevo modificador
            </button>
          </div>

          @if (modifierFeedback(); as message) {
            <p role="alert" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ message }}</p>
          }

          <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
            <thead class="bg-slate-50 text-left text-slate-600">
              <tr>
                <th class="px-4 py-3">Modificador</th>
                <th class="px-4 py-3 text-right">Costo adicional</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (modifier of modifiers(); track modifier.dish_modifier_id) {
                <tr class="border-t border-slate-100">
                  <td class="px-4 py-3 font-medium">{{ modifier.name }}</td>
                  <td class="px-4 py-3 text-right">{{ asCurrency(modifier.extra_price) }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="rounded-full px-2 py-1 text-xs"
                      [class]="
                        modifier.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      "
                    >
                      {{ modifier.active ? 'Activo' : 'Dado de baja' }}
                    </span>
                  </td>
                  <td class="space-x-3 px-4 py-3">
                    <button type="button" (click)="openEdit(modifier)" class="text-slate-900 underline">
                      Editar
                    </button>
                    @if (modifier.active) {
                      <button type="button" (click)="deleteModifier(modifier)" class="text-red-700 underline">
                        Dar de baja
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500">
                    Este platillo no tiene modificadores.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- <dialog> nativo para alta/edicion de modificador. -->
      <dialog #modifierDialog class="rounded-xl p-6 shadow-xl backdrop:bg-slate-900/40">
        <form method="dialog" class="space-y-4" (submit)="confirmModifier()">
          <h2 class="text-lg font-semibold">
            {{ editTarget() ? 'Editar modificador' : 'Nuevo modificador' }}
          </h2>
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Nombre</span>
            <input
              type="text"
              maxlength="60"
              required
              [value]="modName()"
              (input)="modName.set($any($event.target).value)"
              class="mt-1 w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Costo adicional</span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              [value]="modPrice()"
              (input)="modPrice.set(+$any($event.target).value)"
              class="mt-1 w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          @if (dialogFailure(); as message) {
            <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ message }}</p>
          }
          <div class="flex justify-end gap-2">
            <button type="button" (click)="closeDialog()" class="px-3 py-2 text-sm">Cancelar</button>
            <button
              type="submit"
              [disabled]="modName().trim().length === 0"
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
export class DishDetailPage {
  /** Viene de la ruta /menu/:id. */
  readonly id = input.required<string>();

  private readonly menu = inject(MenuService);
  protected readonly asCurrency = formatCurrency;

  protected readonly dish = signal<DishDetailView | null>(null);
  protected readonly modifiers = signal<ModifierView[]>([]);
  protected readonly failure = signal<string | null>(null);
  protected readonly modifierFeedback = signal<string | null>(null);

  // Estado del <dialog> de modificador.
  protected readonly editTarget = signal<ModifierView | null>(null);
  protected readonly modName = signal('');
  protected readonly modPrice = signal(0);
  protected readonly dialogFailure = signal<string | null>(null);

  private readonly modifierDialog = viewChild.required<ElementRef<HTMLDialogElement>>('modifierDialog');

  constructor() {
    void this.load();
  }

  protected openCreate(): void {
    this.editTarget.set(null);
    this.modName.set('');
    this.modPrice.set(0);
    this.dialogFailure.set(null);
    this.modifierDialog().nativeElement.showModal();
  }

  protected openEdit(modifier: ModifierView): void {
    this.editTarget.set(modifier);
    this.modName.set(modifier.name);
    this.modPrice.set(modifier.extra_price);
    this.dialogFailure.set(null);
    this.modifierDialog().nativeElement.showModal();
  }

  protected closeDialog(): void {
    this.modifierDialog().nativeElement.close();
  }

  protected async confirmModifier(): Promise<void> {
    this.dialogFailure.set(null);

    const body = { name: this.modName().trim(), extra_price: this.modPrice() };
    const target = this.editTarget();

    try {
      if (target !== null) {
        await this.menu.updateModifier(target.dish_modifier_id, body);
      } else {
        await this.menu.createModifier(Number(this.id()), body);
      }

      await this.reloadModifiers();
      this.closeDialog();
    } catch (error) {
      // MODIFIER_NAME_TAKEN llega como 409: el formulario no puede prevenirlo.
      this.dialogFailure.set(messageFor(error));
    }
  }

  protected async deleteModifier(modifier: ModifierView): Promise<void> {
    this.modifierFeedback.set(null);

    try {
      await this.menu.deleteModifier(modifier.dish_modifier_id);
      await this.reloadModifiers();
    } catch (error) {
      this.modifierFeedback.set(messageFor(error));
    }
  }

  private async load(): Promise<void> {
    this.failure.set(null);

    try {
      const detail = await this.menu.findDish(Number(this.id()));
      this.dish.set(detail);
      await this.reloadModifiers();
    } catch (error) {
      // DISH_NOT_FOUND llega como 404.
      this.failure.set(messageFor(error));
    }
  }

  private async reloadModifiers(): Promise<void> {
    this.modifiers.set(await this.menu.modifiersOf(Number(this.id())));
  }
}
