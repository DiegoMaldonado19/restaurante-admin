import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiningService } from '../dining.service';
import { TableStatus } from '../dining.types';
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
  TERRAZA: 'Terraza',
  BARRA: 'Barra',
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
                class="rounded-lg border border-[#1F2422]/10 border-l-4 bg-white p-4 text-sm shadow-sm hover:shadow-md transition-shadow"
                [class]="statusBar(row.status)"
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
              </div>
            } @empty {
              <p class="col-span-full text-[#1F2422]/60">Sin mesas registradas.</p>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class FloorPlanPage {
  protected readonly dining = inject(DiningService);
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateTime = formatDateTime;

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
