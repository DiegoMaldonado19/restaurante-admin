import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency } from '../../../core/format';
import { MenuService } from '../menu.service';
import { ComboView } from '../menu.types';

/** Combos y promociones: varios platillos a un precio especial. */
@Component({
  selector: 'app-combo-list',
  imports: [RouterLink],
  template: `
    <section class="space-y-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-slate-900">Combos</h1>
        <div class="flex gap-2">
          <a routerLink="/menu" class="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Platillos
          </a>
          <a
            routerLink="/menu/combos/nuevo"
            class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Nuevo combo
          </a>
        </div>
      </header>

      <div class="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
        <select
          [value]="menu.comboActiveFilter()"
          (change)="onFilterChange($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </select>
      </div>

      @if (feedback(); as message) {
        <p role="alert" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ message }}</p>
      }

      @if (menu.combos.isLoading()) {
        <p class="text-slate-500">Cargando combos...</p>
      } @else if (menu.combos.error()) {
        <p class="text-red-600">{{ errorMessage() }}</p>
      } @else {
        <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3">Combo</th>
              <th class="px-4 py-3">Descripcion</th>
              <th class="px-4 py-3 text-right">Precio</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (combo of menu.combos.value() ?? []; track combo.combo_id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3 font-medium">{{ combo.name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ combo.description ?? '—' }}</td>
                <td class="px-4 py-3 text-right">{{ asCurrency(combo.combo_price) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [class]="
                      combo.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    "
                  >
                    {{ combo.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="space-x-3 px-4 py-3">
                  <a [routerLink]="['/menu/combos', combo.combo_id]" class="text-slate-900 underline">
                    Editar
                  </a>
                  <button type="button" (click)="toggleStatus(combo)" class="text-slate-900 underline">
                    {{ combo.active ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-4 py-6 text-center text-slate-500">
                  No hay combos que coincidan con el filtro.
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class ComboListPage {
  protected readonly menu = inject(MenuService);
  protected readonly asCurrency = formatCurrency;

  protected readonly feedback = signal<string | null>(null);

  protected errorMessage(): string {
    return messageFor(this.menu.combos.error());
  }

  protected onFilterChange(value: string): void {
    this.menu.comboActiveFilter.set(value === '' ? '' : value === 'true');
  }

  protected async toggleStatus(combo: ComboView): Promise<void> {
    this.feedback.set(null);

    try {
      await this.menu.changeComboStatus(combo.combo_id, !combo.active);
      this.menu.combos.reload();
    } catch (error) {
      this.feedback.set(messageFor(error));
    }
  }
}
