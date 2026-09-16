import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiningService } from '../dining.service';
import { TableStatus } from '../dining.types';
import { messageFor } from '../../../core/error-messages';
import { formatCurrency, formatDateTime } from '../../../core/format';

const STATUS_LABEL: Record<TableStatus, string> = {
  FREE: 'Libre',
  RESERVED: 'Reservada',
  OCCUPIED: 'Ocupada',
  BILL_REQUESTED: 'Cuenta pedida',
};

const STATUS_BAR: Record<TableStatus, string> = {
  FREE: 'border-l-[#3B7A57]',
  RESERVED: 'border-l-[#C98A2E]',
  OCCUPIED: 'border-l-[#B5482A]',
  BILL_REQUESTED: 'border-l-[#B5482A]',
};

const STATUS_DOT: Record<TableStatus, string> = {
  FREE: 'bg-[#3B7A57]',
  RESERVED: 'bg-[#C98A2E]',
  OCCUPIED: 'bg-[#B5482A]',
  BILL_REQUESTED: 'bg-[#B5482A]',
};

const STATUS_BADGE_BG: Record<TableStatus, string> = {
  FREE: 'bg-[#3B7A57]/10 text-[#3B7A57]',
  RESERVED: 'bg-[#C98A2E]/10 text-[#C98A2E]',
  OCCUPIED: 'bg-[#B5482A]/10 text-[#B5482A]',
  BILL_REQUESTED: 'bg-[#B5482A]/10 text-[#B5482A]',
};

const ZONE_LABEL: Record<string, string> = {
  SALON: 'Salón',
  TERRACE: 'Terraza',
  BAR: 'Barra',
};

@Component({
  selector: 'app-floor-plan',
  imports: [RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-6 flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-[#1F2422]">Salón</h1>
          <p class="mt-1 text-sm text-[#1F2422]/60">Estado de las mesas en tiempo real</p>
        </div>
        <a
          routerLink="/reservas"
          class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-white transition-colors"
        >
          Ver reservas
        </a>
      </header>

      @if (!dining.floorPlan.isLoading() && dining.floorPlan.value().length > 0) {
        <div class="mb-6 flex flex-wrap gap-3">
          <div class="rounded-lg bg-white border border-[#1F2422]/10 px-4 py-2.5">
            <span class="text-lg font-semibold text-[#1F2422]">{{ dining.floorPlan.value().length }}</span>
            <span class="ml-1.5 text-sm text-[#1F2422]/60">mesas</span>
          </div>
          @for (status of presentStatuses(); track status) {
            <div class="flex items-center gap-2 rounded-lg bg-white border border-[#1F2422]/10 px-4 py-2.5">
              <span class="h-2 w-2 rounded-full" [class]="statusDot(status)"></span>
              <span class="text-sm font-medium text-[#1F2422]">{{ countByStatus(status) }}</span>
              <span class="text-sm text-[#1F2422]/60">{{ statusLabel(status) }}</span>
            </div>
          }
        </div>
      }

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
        @if (dining.floorPlan.isLoading()) {
          <p class="text-[#1F2422]/60">Cargando plano...</p>
        } @else {
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            @for (row of dining.floorPlan.value(); track row.restaurant_table_id) {
              <div
                class="rounded-lg border border-[#1F2422]/10 border-l-4 bg-white p-4 text-sm shadow-sm transition-shadow"
                [class]="statusBar(row.status) + ' ' + selectionRing(row.restaurant_table_id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-semibold text-[#1F2422]">Mesa {{ row.table_number }}</p>
                    <p class="mt-0.5 text-xs text-[#1F2422]/50">{{ zoneLabel(row.zone) }} · {{ row.capacity }} personas</p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    [class]="statusBadge(row.status)"
                  >
                    {{ statusLabel(row.status) }}
                  </span>
                </div>

                @if (row.open_account) {
                  <div class="mt-3 border-t border-[#1F2422]/10 pt-3 text-xs text-[#1F2422]/60 space-y-0.5">
                    <p>Atiende {{ row.open_account.waiter_name }}</p>
                    <p class="font-medium text-[#1F2422]">{{ formatCurrency(row.open_account.running_total) }}</p>
                  </div>
                }
                @if (row.next_reservation) {
                  <div class="mt-3 border-t border-[#1F2422]/10 pt-3 text-xs">
                    <p class="font-medium text-[#C98A2E]">{{ row.next_reservation.customer_name }}</p>
                    <p class="text-[#1F2422]/50">{{ formatDateTime(row.next_reservation.reserved_at) }}</p>
                  </div>
                }
                @if (row.status === 'FREE') {
                  <button
                    type="button"
                    class="mt-3 w-full rounded-lg border border-[#2F6F5E]/30 px-2 py-1.5 text-xs font-medium text-[#2F6F5E] hover:bg-[#2F6F5E]/5 transition-colors"
                    (click)="toggleSuggestions(row.restaurant_table_id)"
                  >
                    @if (dining.suggestionTableId() === row.restaurant_table_id) {
                      Ver toda la lista
                    } @else {
                      ¿Quién cabe aquí?
                    }
                  </button>
                }
              </div>
            } @empty {
              <p class="col-span-full text-[#1F2422]/60">Sin mesas registradas.</p>
            }
          </div>
        }
      </section>

      <section class="mt-6 rounded-2xl bg-white border border-[#1F2422]/10 p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wider text-[#1F2422]/50">
              Lista de espera
            </h2>
            @if (suggestionTable(); as mesa) {
              <p class="mt-1 text-sm text-[#2F6F5E]">
                Grupos que caben en la mesa {{ mesa.table_number }} ({{ mesa.capacity }} personas).
              </p>
            } @else {
              <p class="mt-1 text-sm text-[#1F2422]/60">
                Grupos esperando mesa. Toque una mesa libre para ver a quién asignarle.
              </p>
            }
          </div>
          @if (dining.suggestionTableId()) {
            <button
              type="button"
              class="rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-sm text-[#1F2422]/70 hover:bg-[#FAF9F6] transition-colors"
              (click)="dining.suggestionTableId.set(null)"
            >
              Quitar el filtro
            </button>
          }
        </div>

        <form class="mt-4 flex flex-wrap items-end gap-3" (submit)="onAdd($event)">
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Cliente</span>
            <input
              class="mt-1 w-44 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [value]="newName()"
              (input)="newName.set($any($event.target).value)"
            />
          </label>
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Teléfono</span>
            <input
              class="mt-1 w-36 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [value]="newPhone()"
              (input)="newPhone.set($any($event.target).value)"
            />
          </label>
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Personas</span>
            <input
              type="number"
              min="1"
              max="50"
              class="mt-1 w-24 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [value]="newGuests()"
              (input)="newGuests.set($any($event.target).value)"
            />
          </label>
          <button
            type="submit"
            class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            [disabled]="!newName().trim() || !newPhone().trim()"
          >
            Agregar a la lista
          </button>
        </form>

        @if (actionError()) {
          <p class="mt-3 text-sm text-[#B5482A]">{{ actionError() }}</p>
        }

        @if (dining.waitlist.isLoading()) {
          <p class="mt-4 text-[#1F2422]/60">Cargando lista...</p>
        } @else {
          <ul class="mt-4 divide-y divide-[#1F2422]/10">
            @for (entry of dining.waitlist.value(); track entry.waitlist_entry_id) {
              <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p class="text-[#1F2422]">
                    {{ entry.customer_name }} · {{ entry.guest_count }} personas
                  </p>
                  <p class="text-xs text-[#1F2422]/50">
                    {{ entry.customer_phone }} · espera desde {{ formatDateTime(entry.arrived_at) }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  @if (suggestionTable(); as mesa) {
                    <button
                      type="button"
                      class="rounded-lg bg-[#2F6F5E] px-3 py-1.5 text-white text-xs font-medium hover:bg-[#26594B] transition-colors"
                      (click)="onSeat(entry.waitlist_entry_id, mesa.restaurant_table_id)"
                    >
                      Sentar en la mesa {{ mesa.table_number }}
                    </button>
                  }
                  <button
                    type="button"
                    class="text-xs text-[#1F2422]/50 hover:text-[#B5482A] transition-colors"
                    (click)="onRemove(entry.waitlist_entry_id)"
                  >
                    Se retiró
                  </button>
                </div>
              </li>
            } @empty {
              <p class="py-3 text-[#1F2422]/60">
                @if (dining.suggestionTableId()) {
                  Ningún grupo en espera cabe en esa mesa.
                } @else {
                  No hay nadie en la lista de espera.
                }
              </p>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class FloorPlanPage {
  protected readonly dining = inject(DiningService);
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateTime = formatDateTime;

  protected readonly newName = signal('');
  protected readonly newPhone = signal('');
  protected readonly newGuests = signal('2');
  protected readonly actionError = signal<string | null>(null);

  /** La mesa libre seleccionada, si sigue en el plano y sigue libre. */
  protected readonly suggestionTable = computed(() => {
    const tableId = this.dining.suggestionTableId();
    if (!tableId) return null;

    return (
      this.dining.floorPlan
        .value()
        .find((row) => row.restaurant_table_id === tableId && row.status === 'FREE') ?? null
    );
  });

  protected selectionRing(tableId: number): string {
    return this.dining.suggestionTableId() === tableId ? 'ring-2 ring-[#2F6F5E]' : '';
  }

  protected toggleSuggestions(tableId: number): void {
    this.dining.suggestionTableId.update((current) => (current === tableId ? null : tableId));
  }

  protected async onAdd(event: Event): Promise<void> {
    event.preventDefault();
    this.actionError.set(null);

    try {
      await this.dining.addToWaitlist({
        customer_name: this.newName().trim(),
        customer_phone: this.newPhone().trim(),
        guest_count: Math.max(1, Math.floor(Number(this.newGuests()) || 1)),
      });
      this.newName.set('');
      this.newPhone.set('');
      this.newGuests.set('2');
    } catch (error) {
      this.actionError.set(messageFor(error));
    }
  }

  protected async onSeat(entryId: number, tableId: number): Promise<void> {
    this.actionError.set(null);

    try {
      await this.dining.seatFromWaitlist(entryId, tableId);
      this.dining.suggestionTableId.set(null);
    } catch (error) {
      this.actionError.set(messageFor(error));
    }
  }

  protected async onRemove(entryId: number): Promise<void> {
    this.actionError.set(null);

    try {
      await this.dining.removeFromWaitlist(entryId);
    } catch (error) {
      this.actionError.set(messageFor(error));
    }
  }

  protected readonly presentStatuses = computed(() => {
    const rows = this.dining.floorPlan.value();
    const seen = new Set<TableStatus>();
    for (const row of rows) seen.add(row.status);
    return Array.from(seen);
  });

  protected countByStatus(status: TableStatus): number {
    return this.dining.floorPlan.value().filter((row) => row.status === status).length;
  }

  protected statusLabel(status: TableStatus): string {
    return STATUS_LABEL[status];
  }

  protected statusBar(status: TableStatus): string {
    return STATUS_BAR[status];
  }

  protected statusDot(status: TableStatus): string {
    return STATUS_DOT[status];
  }

  protected statusBadge(status: TableStatus): string {
    return STATUS_BADGE_BG[status];
  }

  protected zoneLabel(zone: string): string {
    return ZONE_LABEL[zone] ?? zone;
  }
}
