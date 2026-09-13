import { Component, inject } from '@angular/core';
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

@Component({
  selector: 'app-floor-plan',
  imports: [RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-[#1F2422]">Salón</h1>
          <p class="mt-1 text-sm text-[#1F2422]/60">Estado de las mesas en tiempo real</p>
        </div>
        
        <a
          routerLink="/reservas"
          class="rounded-lg border border-[#1F2422]/15 px-4 py-2 text-sm text-[#1F2422]/70 hover:bg-[#1F2422]/5 transition-colors"
        >
          Ver reservas
        </a>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
        @if (dining.floorPlan.isLoading()) {
          <p class="text-[#1F2422]/60">Cargando plano...</p>
        } @else {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            @for (row of dining.floorPlan.value(); track row.restaurant_table_id) {
              <div class="rounded-lg border border-[#1F2422]/10 border-l-4 bg-white p-4 text-sm shadow-sm"
                   [class]="statusBar(row.status)">
                <div class="flex items-center justify-between">
                  <p class="font-semibold text-[#1F2422]">Mesa {{ row.table_number }}</p>
                  <span class="inline-flex items-center gap-1.5 text-xs text-[#1F2422]/70">
                    <span class="h-1.5 w-1.5 rounded-full" [class]="statusDot(row.status)"></span>
                    {{ statusLabel(row.status) }}
                  </span>
                </div>
                <p class="mt-1 text-[#1F2422]/60">{{ row.zone }} · {{ row.capacity }} personas</p>
                @if (row.open_account) {
                  <div class="mt-2 border-t border-[#1F2422]/10 pt-2 text-xs text-[#1F2422]/60">
                    <p>Atiende {{ row.open_account.waiter_name }}</p>
                    <p>Consumo: {{ formatCurrency(row.open_account.running_total) }}</p>
                  </div>
                }
                @if (row.next_reservation) {
                  <p class="mt-2 text-xs font-medium text-[#C98A2E]">
                    {{ row.next_reservation.customer_name }} · {{ formatDateTime(row.next_reservation.reserved_at) }}
                  </p>
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

  protected statusLabel(status: TableStatus): string {
    return STATUS_LABEL[status];
  }

  protected statusBar(status: TableStatus): string {
    return STATUS_BAR[status];
  }

  protected statusDot(status: TableStatus): string {
    return STATUS_DOT[status];
  }
}
