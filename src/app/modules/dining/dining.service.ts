import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  ReservationView,
  CreateReservationRequest,
  UpdateReservationRequest,
  CancelReservationRequest,
  FloorPlanRow,
} from './dining.types';

/** Spring Data envuelve las listas paginadas asi: { content: T[], page: {...} }. */
interface PageResponse<T> {
  content: T[];
}

export interface ReservationFilters {
  date: string | null;
  status: string | null;
}

@Injectable({ providedIn: 'root' })
export class DiningService
{
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly floorPlanResource = httpResource<FloorPlanRow[]>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/floor-plan` : undefined),
    { defaultValue: [] },
  );

  readonly floorPlan = {
    isLoading: this.floorPlanResource.isLoading,
    value: this.floorPlanResource.value,
    reload: () => this.floorPlanResource.reload(),
  };

  readonly reservationFilters = signal<ReservationFilters>({ date: null, status: null });

  private readonly reservationsPage = httpResource<PageResponse<ReservationView>>(
    () => {
      if (!this.isBrowser) return undefined;

      const filters = this.reservationFilters();
      const params = new URLSearchParams();
      if (filters.date) params.set('date', filters.date);
      if (filters.status) params.set('status', filters.status);

      return `${this.api.apiBaseUrl}/api/v1/reservations?${params.toString()}`;
    },
    { defaultValue: { content: [] } },
  );

  readonly reservations = {
    isLoading: this.reservationsPage.isLoading,
    value: computed(() => this.reservationsPage.value().content),
    reload: () => this.reservationsPage.reload(),
  };

  private reloadAll(): void {
    this.floorPlan.reload();
    this.reservations.reload();
  }

  async findReservationById(reservationId: number): Promise<ReservationView> {
    return firstValueFrom(
      this.http.get<ReservationView>(`${this.api.apiBaseUrl}/api/v1/reservations/${reservationId}`),
    );
  }

  async createReservation(request: CreateReservationRequest): Promise<ReservationView> {
    const reservation = await firstValueFrom(
      this.http.post<ReservationView>(`${this.api.apiBaseUrl}/api/v1/reservations`, request),
    );
    this.reloadAll();
    return reservation;
  }

  async updateReservation(reservationId: number, request: UpdateReservationRequest): Promise<ReservationView> {
    const reservation = await firstValueFrom(
      this.http.put<ReservationView>(`${this.api.apiBaseUrl}/api/v1/reservations/${reservationId}`, request),
    );
    this.reloadAll();
    return reservation;
  }

  async cancelReservation(reservationId: number, request: CancelReservationRequest): Promise<ReservationView> {
    const reservation = await firstValueFrom(
      this.http.post<ReservationView>(
        `${this.api.apiBaseUrl}/api/v1/reservations/${reservationId}/cancellations`,
        request,
      ),
    );
    this.reloadAll();
    return reservation;
  }
}
