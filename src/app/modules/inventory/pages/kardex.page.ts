import { Component, inject } from '@angular/core';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency, formatDateTime } from '../../../core/format';
import { InventoryService } from '../inventory.service';
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPES,
  MovementType,
  WASTE_REASON_LABELS,
  WasteReason,
} from '../inventory.types';

/**
 * El kardex del enunciado: entradas, ventas, mermas y ajustes, todos con fecha y usuario
 * responsable. El kardex de un insumo es este mismo listado con el filtro puesto, por eso
 * no existe /supplies/{id}/stock-movements.
 */
@Component({
  selector: 'app-kardex',
  template: `
    <section class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Kardex</h1>

      <div class="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow">
        <select
          [value]="inventory.kardexSupply()"
          (change)="inventory.kardexSupply.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los insumos</option>
          @for (supply of inventory.pickerSupplies.value()?.content ?? []; track supply.supply_id) {
            <option [value]="supply.supply_id">{{ supply.name }}</option>
          }
        </select>
        <select
          [value]="inventory.kardexType()"
          (change)="inventory.kardexType.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los movimientos</option>
          @for (type of types; track type) {
            <option [value]="type">{{ typeLabels[type] }}</option>
          }
        </select>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          Desde
          <input
            type="date"
            [value]="inventory.kardexFrom()"
            (change)="inventory.kardexFrom.set($any($event.target).value)"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          Hasta
          <input
            type="date"
            [value]="inventory.kardexTo()"
            (change)="inventory.kardexTo.set($any($event.target).value)"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      @if (inventory.kardex.isLoading()) {
        <p class="text-slate-500">Cargando movimientos...</p>
      } @else if (inventory.kardex.error()) {
        <p class="text-red-600">{{ errorMessage() }}</p>
      } @else {
        <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Insumo</th>
              <th class="px-4 py-3">Movimiento</th>
              <th class="px-4 py-3 text-right">Cantidad</th>
              <th class="px-4 py-3 text-right">Costo</th>
              <th class="px-4 py-3">Motivo</th>
              <th class="px-4 py-3 text-right">Usuario</th>
            </tr>
          </thead>
          <tbody>
            @for (movement of inventory.kardex.value()?.content ?? []; track movement.stock_movement_id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3 text-slate-500">{{ asDateTime(movement.created_at) }}</td>
                <td class="px-4 py-3">{{ movement.supply_name }}</td>
                <td class="px-4 py-3">{{ typeLabels[movement.movement_type] }}</td>
                <td
                  class="px-4 py-3 text-right font-medium"
                  [class]="movement.quantity < 0 ? 'text-red-600' : 'text-emerald-700'"
                >
                  {{ movement.quantity }}
                </td>
                <td class="px-4 py-3 text-right text-slate-500">
                  {{ movement.unit_cost === null ? '-' : asCurrency(movement.unit_cost) }}
                </td>
                <td class="px-4 py-3 text-slate-500">{{ describe(movement.waste_reason, movement.reason) }}</td>
                <td class="px-4 py-3 text-right text-slate-500">{{ movement.user_id }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="px-4 py-6 text-center text-slate-500">
                  No hay movimientos que coincidan con el filtro.
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class KardexPage {
  protected readonly inventory = inject(InventoryService);

  protected readonly types = MOVEMENT_TYPES;
  protected readonly typeLabels = MOVEMENT_TYPE_LABELS;
  protected readonly asDateTime = formatDateTime;
  protected readonly asCurrency = formatCurrency;

  protected errorMessage(): string {
    return messageFor(this.inventory.kardex.error());
  }

  protected describe(wasteReason: WasteReason | null, reason: string | null): string {
    const label = wasteReason === null ? null : WASTE_REASON_LABELS[wasteReason];

    return [label, reason].filter(Boolean).join(' - ') || '-';
  }
}
