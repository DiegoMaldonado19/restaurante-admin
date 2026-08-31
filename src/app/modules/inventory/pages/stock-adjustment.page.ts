import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, maxLength, required, submit, validate } from '@angular/forms/signals';
import { messageFor } from '../../../core/error-messages';
import { InventoryService } from '../inventory.service';
import { MEASURE_UNIT_SYMBOLS } from '../inventory.types';

interface AdjustmentModel {
  supply_id: string;
  quantity: number;
  reason: string;
}

/** Ajuste manual: el unico movimiento con signo, para cuadrar contra un conteo fisico. */
@Component({
  selector: 'app-stock-adjustment',
  imports: [FormField],
  template: `
    <section class="max-w-lg space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Ajuste manual</h1>

      <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Insumo</span>
          <select
            [formField]="adjustmentForm.supply_id"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Elija un insumo</option>
            @for (supply of activeSupplies(); track supply.supply_id) {
              <option [value]="supply.supply_id">
                {{ supply.name }} ({{ supply.current_stock }} {{ symbols[supply.measure_unit] }})
              </option>
            }
          </select>
          @if (adjustmentForm.supply_id().touched() && adjustmentForm.supply_id().invalid()) {
            @for (error of adjustmentForm.supply_id().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Cantidad a ajustar</span>
          <input
            type="number"
            step="0.001"
            [formField]="adjustmentForm.quantity"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (adjustmentForm.quantity().touched() && adjustmentForm.quantity().invalid()) {
            @for (error of adjustmentForm.quantity().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
          <span class="mt-1 block text-xs text-slate-500">
            En positivo suma a la existencia; en negativo, la resta.
          </span>
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Motivo</span>
          <input
            type="text"
            [formField]="adjustmentForm.reason"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (adjustmentForm.reason().touched() && adjustmentForm.reason().invalid()) {
            @for (error of adjustmentForm.reason().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        @if (feedback(); as message) {
          <p role="alert" class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {{ message }}
          </p>
        }
        @if (failure()) {
          <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ failure() }}</p>
        }

        <div class="flex justify-end">
          <button
            type="submit"
            [disabled]="adjustmentForm().invalid() || adjustmentForm().submitting()"
            class="rounded-md bg-slate-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Registrar ajuste
          </button>
        </div>
      </form>
    </section>
  `,
})
export class StockAdjustmentPage {
  private readonly inventory = inject(InventoryService);

  protected readonly symbols = MEASURE_UNIT_SYMBOLS;

  protected readonly feedback = signal<string | null>(null);
  protected readonly failure = signal<string | null>(null);

  protected readonly activeSupplies = computed(
    () => this.inventory.pickerSupplies.value()?.content ?? [],
  );

  protected readonly model = signal<AdjustmentModel>({
    supply_id: '',
    quantity: 0,
    reason: '',
  });

  protected readonly adjustmentForm = form(this.model, (path) => {
    required(path.supply_id, { message: 'Elija un insumo' });
    required(path.reason, { message: 'El motivo del ajuste es obligatorio' });
    maxLength(path.reason, 255, { message: 'El motivo no puede pasar de 255 caracteres' });

    // Un ajuste de cero no es un ajuste. Espeja la misma guarda del InventoryService.
    validate(path.quantity, ({ value }) =>
      Number(value()) === 0 ? { kind: 'zero', message: 'El ajuste tiene que ser distinto de cero' } : null,
    );
  });

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.feedback.set(null);
    this.failure.set(null);

    submit(this.adjustmentForm, {
      action: async () => {
        const value = this.model();

        try {
          const movement = await this.inventory.registerAdjustment({
            supply_id: Number(value.supply_id),
            quantity: Number(value.quantity),
            reason: value.reason,
          });

          this.inventory.supplies.reload();
          this.inventory.pickerSupplies.reload();
          this.inventory.kardex.reload();
          this.feedback.set(`Ajuste registrado para ${movement.supply_name}.`);
          this.model.set({ supply_id: '', quantity: 0, reason: '' });
        } catch (error) {
          // INSUFFICIENT_STOCK: un ajuste negativo no puede dejar la existencia bajo cero.
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }
}
