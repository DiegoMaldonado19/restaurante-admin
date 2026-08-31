import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { messageFor } from '../../../core/error-messages';
import { InventoryService } from '../inventory.service';
import { MEASURE_UNIT_SYMBOLS } from '../inventory.types';

interface EntryModel {
  supply_id: string;
  quantity: number;
  purchase_cost: number;
  entry_date: string;
}

/** Entrada de mercaderia: sube la existencia y sobrescribe el costo unitario del insumo. */
@Component({
  selector: 'app-stock-entry',
  imports: [FormField],
  template: `
    <section class="max-w-lg space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Entrada de mercaderia</h1>

      <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Insumo</span>
          <select
            [formField]="entryForm.supply_id"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Elija un insumo</option>
            @for (supply of activeSupplies(); track supply.supply_id) {
              <option [value]="supply.supply_id">
                {{ supply.name }} ({{ supply.current_stock }} {{ symbols[supply.measure_unit] }})
              </option>
            }
          </select>
          @if (entryForm.supply_id().touched() && entryForm.supply_id().invalid()) {
            @for (error of entryForm.supply_id().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Cantidad recibida</span>
          <input
            type="number"
            step="0.001"
            [formField]="entryForm.quantity"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (entryForm.quantity().touched() && entryForm.quantity().invalid()) {
            @for (error of entryForm.quantity().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Costo unitario de compra</span>
          <input
            type="number"
            step="0.01"
            [formField]="entryForm.purchase_cost"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (entryForm.purchase_cost().touched() && entryForm.purchase_cost().invalid()) {
            @for (error of entryForm.purchase_cost().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
          <span class="mt-1 block text-xs text-slate-500">
            Este costo pasa a ser el costo unitario del insumo.
          </span>
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Fecha de la compra</span>
          <input
            type="date"
            [max]="today"
            [formField]="entryForm.entry_date"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (entryForm.entry_date().touched() && entryForm.entry_date().invalid()) {
            @for (error of entryForm.entry_date().errors(); track error.kind) {
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
            [disabled]="entryForm().invalid() || entryForm().submitting()"
            class="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Registrar entrada
          </button>
        </div>
      </form>
    </section>
  `,
})
export class StockEntryPage {
  private readonly inventory = inject(InventoryService);

  protected readonly symbols = MEASURE_UNIT_SYMBOLS;
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly feedback = signal<string | null>(null);
  protected readonly failure = signal<string | null>(null);

  protected readonly activeSupplies = computed(
    () => this.inventory.pickerSupplies.value()?.content ?? [],
  );

  protected readonly model = signal<EntryModel>({
    supply_id: '',
    quantity: 0,
    purchase_cost: 0,
    entry_date: this.today,
  });

  protected readonly entryForm = form(this.model, (path) => {
    required(path.supply_id, { message: 'Elija un insumo' });

    required(path.quantity, { message: 'La cantidad es obligatoria' });
    min(path.quantity, 0.001, { message: 'La cantidad debe ser mayor que cero' });

    required(path.purchase_cost, { message: 'El costo de compra es obligatorio' });
    min(path.purchase_cost, 0, { message: 'El costo de compra no puede ser negativo' });

    required(path.entry_date, { message: 'La fecha de la compra es obligatoria' });
  });

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.feedback.set(null);
    this.failure.set(null);

    submit(this.entryForm, {
      action: async () => {
        const value = this.model();

        try {
          const movement = await this.inventory.registerEntry({
            supply_id: Number(value.supply_id),
            quantity: Number(value.quantity),
            purchase_cost: Number(value.purchase_cost),
            entry_date: value.entry_date,
          });

          this.inventory.supplies.reload();
          this.inventory.pickerSupplies.reload();
          this.inventory.kardex.reload();
          this.feedback.set(`Entrada registrada para ${movement.supply_name}.`);
          this.model.set({ supply_id: '', quantity: 0, purchase_cost: 0, entry_date: this.today });
        } catch (error) {
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }
}
