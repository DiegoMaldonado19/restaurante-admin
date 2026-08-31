import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, maxLength, min, required, submit } from '@angular/forms/signals';
import { messageFor } from '../../../core/error-messages';
import { InventoryService } from '../inventory.service';
import { MEASURE_UNIT_SYMBOLS, WASTE_REASON_LABELS, WASTE_REASONS, WasteReason } from '../inventory.types';

interface WasteModel {
  supply_id: string;
  quantity: number;
  waste_reason: WasteReason;
  reason: string;
}

/** Merma: baja por vencimiento, dano o error de manejo. Nunca puede exceder la existencia. */
@Component({
  selector: 'app-stock-waste',
  imports: [FormField],
  template: `
    <section class="max-w-lg space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Registro de merma</h1>

      <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Insumo</span>
          <select
            [formField]="wasteForm.supply_id"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Elija un insumo</option>
            @for (supply of activeSupplies(); track supply.supply_id) {
              <option [value]="supply.supply_id">
                {{ supply.name }} ({{ supply.current_stock }} {{ symbols[supply.measure_unit] }})
              </option>
            }
          </select>
          @if (wasteForm.supply_id().touched() && wasteForm.supply_id().invalid()) {
            @for (error of wasteForm.supply_id().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Cantidad dada de baja</span>
          <input
            type="number"
            step="0.001"
            [formField]="wasteForm.quantity"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (wasteForm.quantity().touched() && wasteForm.quantity().invalid()) {
            @for (error of wasteForm.quantity().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Motivo</span>
          <select
            [formField]="wasteForm.waste_reason"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            @for (reason of reasons; track reason) {
              <option [value]="reason">{{ reasonLabels[reason] }}</option>
            }
          </select>
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Nota (opcional)</span>
          <input
            type="text"
            [formField]="wasteForm.reason"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
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
            [disabled]="wasteForm().invalid() || wasteForm().submitting()"
            class="rounded-md bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Registrar merma
          </button>
        </div>
      </form>
    </section>
  `,
})
export class StockWastePage {
  private readonly inventory = inject(InventoryService);

  protected readonly symbols = MEASURE_UNIT_SYMBOLS;
  protected readonly reasons = WASTE_REASONS;
  protected readonly reasonLabels = WASTE_REASON_LABELS;

  protected readonly feedback = signal<string | null>(null);
  protected readonly failure = signal<string | null>(null);

  protected readonly activeSupplies = computed(
    () => this.inventory.pickerSupplies.value()?.content ?? [],
  );

  protected readonly model = signal<WasteModel>({
    supply_id: '',
    quantity: 0,
    waste_reason: 'EXPIRED',
    reason: '',
  });

  protected readonly wasteForm = form(this.model, (path) => {
    required(path.supply_id, { message: 'Elija un insumo' });

    required(path.quantity, { message: 'La cantidad es obligatoria' });
    min(path.quantity, 0.001, { message: 'La cantidad debe ser mayor que cero' });

    required(path.waste_reason, { message: 'Elija el motivo de la merma' });

    maxLength(path.reason, 255, { message: 'La nota no puede pasar de 255 caracteres' });
  });

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.feedback.set(null);
    this.failure.set(null);

    submit(this.wasteForm, {
      action: async () => {
        const value = this.model();

        try {
          const movement = await this.inventory.registerWaste({
            supply_id: Number(value.supply_id),
            quantity: Number(value.quantity),
            waste_reason: value.waste_reason,
            reason: value.reason.trim() || null,
          });

          this.inventory.supplies.reload();
          this.inventory.pickerSupplies.reload();
          this.inventory.kardex.reload();
          this.feedback.set(`Merma registrada para ${movement.supply_name}.`);
          this.model.set({ supply_id: '', quantity: 0, waste_reason: 'EXPIRED', reason: '' });
        } catch (error) {
          // WASTE_EXCEEDS_STOCK llega como 409: la existencia pudo cambiar entre medio.
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }
}
