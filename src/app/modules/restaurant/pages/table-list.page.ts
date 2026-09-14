import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { RestaurantService } from '../restaurant.service';
import {
  RestaurantTableView,
  STATUS_BADGE_BG,
  STATUS_LABELS,
  STATUSES,
  TableStatus,
  VALID_TRANSITIONS,
  ZONE_LABELS,
  ZONES,
} from '../restaurant.types';

/**
 * Listado de mesas: filtros, cambio de estado (dialogo con solo las transiciones
 * validas segun VALID_TRANSITIONS) y baja logica (solo si status === 'FREE'). La paleta
 * calida (#FAF9F6/#1F2422/etc.) es la de dining/pages/floor-plan.page.ts, adoptada a
 * proposito para que "Mesas" y "Salon" — dos vistas del mismo dominio de mesa — se
 * vean como parte de la misma familia visual (ver §4.4 del analisis).
 */
@Component({
  selector: 'app-table-list',
  imports: [RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8 flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-[#1F2422]">Mesas</h1>
          <p class="mt-1 text-sm text-[#1F2422]/60">Alta, edicion y estado de las mesas del restaurante</p>
        </div>
        <div class="flex gap-2">
          <a
            routerLink="/restaurante/impuestos"
            class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-white transition-colors"
          >
            Impuestos y propina
          </a>
          <a
            routerLink="/restaurante/puntos"
            class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-white transition-colors"
          >
            Programa de puntos
          </a>
          <a
            routerLink="/restaurante/nueva"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
          >
            Nueva mesa
          </a>
        </div>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
        <div class="flex flex-wrap items-end gap-3">
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Zona</span>
            <select
              [value]="restaurant.zoneFilter()"
              (change)="restaurant.zoneFilter.set($any($event.target).value)"
              class="mt-1 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            >
              <option value="">Todas las zonas</option>
              @for (zone of zones; track zone) {
                <option [value]="zone">{{ zoneLabels[zone] }}</option>
              }
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Estado</span>
            <select
              [value]="restaurant.statusFilter()"
              (change)="restaurant.statusFilter.set($any($event.target).value)"
              class="mt-1 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            >
              <option value="">Todos los estados</option>
              @for (status of statuses; track status) {
                <option [value]="status">{{ statusLabels[status] }}</option>
              }
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Capacidad minima</span>
            <input
              type="number"
              min="1"
              placeholder="Ej. 4"
              [value]="restaurant.minCapacityFilter()"
              (input)="restaurant.minCapacityFilter.set($any($event.target).value)"
              class="mt-1 w-32 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            />
          </label>
        </div>

        @if (feedback(); as message) {
          <p role="alert" class="mt-4 rounded-lg bg-[#B5482A]/10 px-3 py-2 text-sm text-[#B5482A]">
            {{ message }}
          </p>
        }

        @if (restaurant.tables.isLoading()) {
          <p class="mt-6 text-[#1F2422]/60">Cargando mesas...</p>
        } @else if (restaurant.tables.error()) {
          <p class="mt-6 text-[#B5482A]">{{ errorMessage() }}</p>
        } @else {
          <table class="mt-6 w-full text-sm">
            <thead class="border-b border-[#1F2422]/10 text-left text-[#1F2422]/60">
              <tr>
                <th class="py-3 pr-4">Número</th>
                <th class="py-3 pr-4">Capacidad</th>
                <th class="py-3 pr-4">Zona</th>
                <th class="py-3 pr-4">Estado</th>
                <th class="py-3 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1F2422]/10">
              @for (table of restaurant.tables.value()?.content ?? []; track table.restaurant_table_id) {
                <tr>
                  <td class="py-3 pr-4 font-medium text-[#1F2422]">Mesa {{ table.table_number }}</td>
                  <td class="py-3 pr-4 text-[#1F2422]/70">{{ table.capacity }} personas</td>
                  <td class="py-3 pr-4 text-[#1F2422]/70">{{ zoneLabels[table.zone] }}</td>
                  <td class="py-3 pr-4">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      [class]="statusBadge[table.status]"
                    >
                      {{ statusLabels[table.status] }}
                    </span>
                  </td>
                  <td class="space-x-3 py-3 pr-4 whitespace-nowrap">
                    <a
                      [routerLink]="['/restaurante', table.restaurant_table_id]"
                      class="text-[#2F6F5E] hover:underline"
                    >
                      Editar
                    </a>
                    <button
                      type="button"
                      (click)="openStatusDialog(table)"
                      class="text-[#2F6F5E] hover:underline"
                    >
                      Cambiar estado
                    </button>
                    @if (table.status === 'FREE') {
                      <button
                        type="button"
                        (click)="deactivate(table)"
                        class="text-[#B5482A] hover:underline"
                      >
                        Dar de baja
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-6 text-center text-[#1F2422]/60">
                    No hay mesas que coincidan con el filtro.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <!-- <dialog> nativo: ya existe, ya es accesible y ya funciona con teclado. -->
      <dialog #statusDialog class="rounded-2xl p-6 shadow-xl backdrop:bg-[#1F2422]/40">
        <form method="dialog" class="w-80 space-y-4" (submit)="confirmStatusChange()">
          <h2 class="text-lg font-semibold text-[#1F2422]">Cambiar estado</h2>
          <p class="text-sm text-[#1F2422]/60">
            Mesa {{ statusTarget()?.table_number }} — estado actual:
            <strong>{{ statusTarget() ? statusLabels[statusTarget()!.status] : '' }}</strong>
          </p>

          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Nuevo estado</span>
            <select
              [value]="nextStatus()"
              (change)="nextStatus.set($any($event.target).value)"
              class="mt-1 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
            >
              <option value="">Seleccione un estado</option>
              @for (status of statusOptions(); track status) {
                <option [value]="status">{{ statusLabels[status] }}</option>
              }
            </select>
          </label>

          @if (dialogFeedback(); as message) {
            <p class="text-sm text-[#B5482A]">{{ message }}</p>
          }

          <div class="flex justify-end gap-2">
            <button type="button" (click)="closeStatusDialog()" class="px-3 py-2 text-sm text-[#1F2422]/70">
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="!nextStatus()"
              class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-sm text-white hover:bg-[#26594B] disabled:opacity-50 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </form>
      </dialog>
    </div>
  `,
})
export class TableListPage {
  protected readonly restaurant = inject(RestaurantService);

  protected readonly zones = ZONES;
  protected readonly statuses = STATUSES;
  protected readonly zoneLabels = ZONE_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusBadge = STATUS_BADGE_BG;

  protected readonly feedback = signal<string | null>(null);
  protected readonly dialogFeedback = signal<string | null>(null);
  protected readonly statusTarget = signal<RestaurantTableView | null>(null);
  protected readonly nextStatus = signal<TableStatus | ''>('');

  private readonly statusDialog = viewChild.required<ElementRef<HTMLDialogElement>>('statusDialog');

  /** Solo ofrece los destinos con sentido desde el estado actual (§5.4 del analisis). */
  protected readonly statusOptions = computed<TableStatus[]>(() => {
    const target = this.statusTarget();
    return target ? VALID_TRANSITIONS[target.status] : [];
  });

  protected errorMessage(): string {
    return messageFor(this.restaurant.tables.error());
  }

  protected openStatusDialog(table: RestaurantTableView): void {
    this.statusTarget.set(table);
    this.nextStatus.set('');
    this.dialogFeedback.set(null);
    this.statusDialog().nativeElement.showModal();
  }

  protected closeStatusDialog(): void {
    this.statusDialog().nativeElement.close();
  }

  protected async confirmStatusChange(): Promise<void> {
    const target = this.statusTarget();
    const status = this.nextStatus();

    if (!target || !status) {
      return;
    }

    this.dialogFeedback.set(null);
    try {
      await this.restaurant.changeStatus(target.restaurant_table_id, { status });
      this.restaurant.tables.reload();
      this.closeStatusDialog();
    } catch (error) {
      // 409 INVALID_TABLE_TRANSITION llega aqui: la mesa pudo cambiar de estado entre
      // que se abrio el dialogo y se envio la confirmacion.
      this.dialogFeedback.set(messageFor(error));
    }
  }

  /** El backend responde 409 TABLE_NOT_FREE si la mesa cambio de estado justo antes. */
  protected async deactivate(table: RestaurantTableView): Promise<void> {
    this.feedback.set(null);
    try {
      await this.restaurant.deactivate(table.restaurant_table_id);
      this.restaurant.tables.reload();
    } catch (error) {
      this.feedback.set(messageFor(error));
    }
  }
}
