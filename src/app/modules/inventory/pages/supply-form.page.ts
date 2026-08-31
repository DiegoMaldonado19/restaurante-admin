import { Component, computed, inject, input, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { InventoryService } from '../inventory.service';
import { MEASURE_UNIT_LABELS, MEASURE_UNITS, MeasureUnit } from '../inventory.types';

interface SupplyModel {
  supply_category_id: string;
  name: string;
  measure_unit: MeasureUnit;
  unit_cost: number;
  min_stock: number;
  max_stock: number | null;
}

/**
 * Alta y edicion en una sola pantalla. Al editar no se pide el costo unitario: lo fija
 * una entrada de mercaderia, no este formulario. Las validaciones espejan las de
 * CreateSupplyDTO y UpdateSupplyDTO, incluida la regla de umbrales.
 */
@Component({
  selector: 'app-supply-form',
  imports: [FormField],
  template: `
    <section class="max-w-lg space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">
        {{ isEdit() ? 'Editar insumo' : 'Nuevo insumo' }}
      </h1>

      <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Nombre</span>
          <input
            type="text"
            [formField]="supplyForm.name"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (supplyForm.name().touched() && supplyForm.name().invalid()) {
            @for (error of supplyForm.name().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Categoria</span>
          <select
            [formField]="supplyForm.supply_category_id"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Elija una categoria</option>
            @for (category of activeCategories(); track category.supply_category_id) {
              <option [value]="category.supply_category_id">{{ category.name }}</option>
            }
          </select>
          @if (supplyForm.supply_category_id().touched() && supplyForm.supply_category_id().invalid()) {
            @for (error of supplyForm.supply_category_id().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Unidad de medida</span>
          <select
            [formField]="supplyForm.measure_unit"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            @for (unit of units; track unit) {
              <option [value]="unit">{{ unitLabels[unit] }}</option>
            }
          </select>
        </label>

        @if (!isEdit()) {
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Costo unitario de compra</span>
            <input
              type="number"
              step="0.01"
              [formField]="supplyForm.unit_cost"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (supplyForm.unit_cost().touched() && supplyForm.unit_cost().invalid()) {
              @for (error of supplyForm.unit_cost().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>
        }

        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Stock minimo</span>
            <input
              type="number"
              step="0.001"
              [formField]="supplyForm.min_stock"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (supplyForm.min_stock().touched() && supplyForm.min_stock().invalid()) {
              @for (error of supplyForm.min_stock().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Stock maximo (opcional)</span>
            <input
              type="number"
              step="0.001"
              [formField]="supplyForm.max_stock"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (supplyForm.max_stock().touched() && supplyForm.max_stock().invalid()) {
              @for (error of supplyForm.max_stock().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>
        </div>

        @if (isEdit()) {
          <p class="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
            El costo unitario lo fija una entrada de mercaderia y la existencia, un movimiento
            de stock. Ninguno se edita aqui.
          </p>
        }

        @if (failure()) {
          <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ failure() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button type="button" (click)="cancel()" class="px-3 py-2 text-sm">Cancelar</button>
          <button
            type="submit"
            [disabled]="supplyForm().invalid() || supplyForm().submitting()"
            class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </form>
    </section>
  `,
})
export class SupplyFormPage {
  /** Viene de la ruta /inventario/:id. Ausente al dar de alta. */
  readonly id = input<string>();

  private readonly inventory = inject(InventoryService);
  private readonly router = inject(Router);

  protected readonly units = MEASURE_UNITS;
  protected readonly unitLabels = MEASURE_UNIT_LABELS;

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly failure = signal<string | null>(null);

  /** Una categoria dada de baja se conserva en los insumos que la usan, pero ya no se ofrece. */
  protected readonly activeCategories = computed(() =>
    (this.inventory.categories.value() ?? []).filter((category) => category.active),
  );

  protected readonly model = signal<SupplyModel>({
    supply_category_id: '',
    name: '',
    measure_unit: 'UNIT',
    unit_cost: 0,
    min_stock: 0,
    max_stock: null,
  });

  protected readonly supplyForm = form(this.model, (path) => {
    required(path.name, { message: 'El nombre del insumo es obligatorio' });
    required(path.supply_category_id, { message: 'Elija una categoria' });
    required(path.measure_unit, { message: 'Elija una unidad de medida' });

    required(path.unit_cost, { message: 'El costo unitario es obligatorio' });
    min(path.unit_cost, 0, { message: 'El costo unitario no puede ser negativo' });

    required(path.min_stock, { message: 'El stock minimo es obligatorio' });
    min(path.min_stock, 0, { message: 'El stock minimo no puede ser negativo' });

    min(path.max_stock, 0, { message: 'El stock maximo no puede ser negativo' });
  });

  constructor() {
    void this.loadWhenEditing();
  }

  protected cancel(): void {
    this.router.navigate(['/inventario']);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.failure.set(null);

    const value = this.model();

    // Espeja @ConsistentStockThresholds del backend, que es quien manda.
    if (value.max_stock !== null && value.max_stock < value.min_stock) {
      this.failure.set('El stock maximo no puede ser menor que el minimo.');

      return;
    }

    submit(this.supplyForm, {
      action: async () => {
        const supplyId = this.id();
        const common = {
          supply_category_id: Number(value.supply_category_id),
          name: value.name,
          measure_unit: value.measure_unit,
          min_stock: Number(value.min_stock),
          max_stock: value.max_stock === null ? null : Number(value.max_stock),
        };

        try {
          if (supplyId !== undefined) {
            await this.inventory.update(Number(supplyId), common);
          } else {
            await this.inventory.create({ ...common, unit_cost: Number(value.unit_cost) });
          }

          this.inventory.supplies.reload();
          await this.router.navigate(['/inventario']);
        } catch (error) {
          // SUPPLY_NAME_TAKEN llega como 409: el formulario no puede prevenirlo.
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }

  private async loadWhenEditing(): Promise<void> {
    const supplyId = this.id();

    if (supplyId === undefined) {
      return;
    }

    try {
      const { supply } = await this.inventory.findById(Number(supplyId));

      this.model.set({
        supply_category_id: String(supply.supply_category_id),
        name: supply.name,
        measure_unit: supply.measure_unit,
        unit_cost: supply.unit_cost,
        min_stock: supply.min_stock,
        max_stock: supply.max_stock,
      });
    } catch (error) {
      this.failure.set(messageFor(error));
    }
  }
}
