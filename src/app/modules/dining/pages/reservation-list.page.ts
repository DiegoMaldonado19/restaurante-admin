import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiningService } from '../dining.service';
import { ReservationStatus } from '../dining.types';
import { formatDateTime } from '../../../core/format';

const FORMAT_DATE_TIME = formatDateTime;

const STATUS_LABEL: Record<ReservationStatus, string> = {
  BOOKED: 'Reservada',
  SEATED: 'Sentada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No se presentó',
};

@Component({
  selector: 'app-reservation-list',
  imports: [RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-[#1F2422]">Reservas</h1>
          <p class="mt-1 text-sm text-[#1F2422]/60">Crear, reprogramar y cancelar reservas de mesa</p>
        </div>
        
        <a
          routerLink="/reservas/nuevo"
          class="rounded-lg bg-[#2F6F5E] px-4 py-2 text-white text-sm font-medium hover:bg-[#26594B] transition-colors"
        >
          Nueva reserva
        </a>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6">
        <div class="flex flex-wrap gap-3 items-end">
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Fecha</span>
            <input
              type="date"
              class="mt-1 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              (change)="onDateChange($event)"
            />
          </label>
          <label class="block">
            <span class="text-xs text-[#1F2422]/60">Estado</span>
            <select
              class="mt-1 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              (change)="onStatusChange($event)"
            >
              <option value="">Todos</option>
              <option value="BOOKED">Reservada</option>
              <option value="SEATED">Sentada</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="NO_SHOW">No se presentó</option>
            </select>
          </label>
        </div>

        @if (dining.reservations.isLoading()) {
          <p class="mt-6 text-[#1F2422]/60">Cargando reservas...</p>
        } @else {
          <ul class="mt-6 divide-y divide-[#1F2422]/10">
            @for (reservation of dining.reservations.value(); track reservation.reservation_id) {
              <li class="flex items-center justify-between py-3">
                <div>
                  <p class="text-[#1F2422]">
                    {{ reservation.customer_name }} · Mesa {{ reservation.restaurant_table_id }}
                  </p>
                  <p class="text-sm text-[#1F2422]/60">
                    {{ formatDateTime(reservation.reserved_at) }} · {{ reservation.guest_count }} personas ·
                    {{ statusLabel(reservation.status) }}
                  </p>
                </div>
                @if (reservation.status === 'BOOKED') {
                  <div class="flex gap-2">
                    
                    <a
                      [routerLink]="['/reservas', reservation.reservation_id]"
                      class="rounded-lg border border-[#1F2422]/15 px-3 py-1.5 text-[#1F2422]/70 text-sm hover:bg-[#1F2422]/5 transition-colors"
                    >
                      Reprogramar
                    </a>
                    <button
                      type="button"
                      class="rounded-lg border border-[#B5482A]/30 px-3 py-1.5 text-[#B5482A] text-sm hover:bg-[#B5482A]/5 transition-colors"
                      (click)="onCancel(reservation.reservation_id)"
                    >
                      Cancelar
                    </button>
                  </div>
                }
              </li>
            } @empty {
              <p class="py-6 text-[#1F2422]/60">No hay reservas con esos filtros.</p>
            }
          </ul>
        }

        @if (cancelError()) {
          <p class="mt-3 text-sm text-[#B5482A]">{{ cancelError() }}</p>
        }
      </section>
    </div>
  `,
})
export class ReservationListPage {
  protected readonly dining = inject(DiningService);
  protected readonly formatDateTime = formatDateTime;

  protected readonly cancelError = signal<string | null>(null);

  protected statusLabel(status: ReservationStatus): string {
    return STATUS_LABEL[status];
  }

  protected onDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value || null;
    this.dining.reservationFilters.update((f) => ({ ...f, date: value }));
  }

  protected onStatusChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value || null;
    this.dining.reservationFilters.update((f) => ({ ...f, status: value }));
  }

  protected async onCancel(reservationId: number) {
    this.cancelError.set(null);
    try {
      await this.dining.cancelReservation(reservationId, {
        reason: 'CUSTOMER_CANCELLED',
        note: null,
      });
    } catch (error: any) {
      this.cancelError.set(error?.error?.message ?? 'No se pudo cancelar la reserva.');
    }
  }
}
