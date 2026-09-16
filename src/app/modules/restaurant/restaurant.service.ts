import { HttpClient, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, signal, PLATFORM_ID} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  CreateTableDTO,
  PagedTables,
  RestaurantSettingView,
  RestaurantTableView,
  TableStatus,
  TableZone,
  UpdateSettingDTO,
  UpdateTableDTO,
  UpdateTableStatusDTO,
} from './restaurant.types';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  /** En el servidor no hay token, y prerenderizar sin el deja la pantalla en estado de error. */
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly zoneFilter = signal<TableZone | ''>('');
  readonly statusFilter = signal<TableStatus | ''>('');
  readonly minCapacityFilter = signal<number | ''>('');

  /** Se re-pide solo cuando cambia alguno de los filtros leidos dentro de la funcion. */
  readonly tables = httpResource<PagedTables>(() => {
    if (!this.isBrowser) return undefined;
    const params = new URLSearchParams();

    if (this.zoneFilter()) {
      params.set('zone', this.zoneFilter());
    }
    if (this.statusFilter()) {
      params.set('status', this.statusFilter());
    }
    if (this.minCapacityFilter()) {
      params.set('min_capacity', String(this.minCapacityFilter()));
    }

    return `${this.tablesUrl()}?${params.toString()}`;
  });

  /**
   * Singleton: una sola fila. Se comparte entre "Impuestos y propina" y "Programa de
   * puntos" para que ninguna de las dos pantallas pise el par de columnas que edita la
   * otra: PUT /settings reemplaza la fila completa (Analisis-Solucion-Restaurante-Front §3.4).
   */
  readonly setting = httpResource<RestaurantSettingView>(() => (this.isBrowser ? this.settingsUrl() : undefined));

  findById(tableId: number): Promise<RestaurantTableView> {
    return firstValueFrom(this.http.get<RestaurantTableView>(`${this.tablesUrl()}/${tableId}`));
  }

  create(request: CreateTableDTO): Promise<RestaurantTableView> {
    return firstValueFrom(this.http.post<RestaurantTableView>(this.tablesUrl(), request));
  }

  update(tableId: number, request: UpdateTableDTO): Promise<RestaurantTableView> {
    return firstValueFrom(
      this.http.put<RestaurantTableView>(`${this.tablesUrl()}/${tableId}`, request),
    );
  }

  /** La valvula de recuperacion: pasa por la misma matriz que dining/ordering/billing. */
  changeStatus(tableId: number, request: UpdateTableStatusDTO): Promise<RestaurantTableView> {
    return firstValueFrom(
      this.http.patch<RestaurantTableView>(`${this.tablesUrl()}/${tableId}/status`, request),
    );
  }

  /** Baja logica. El backend responde 409 TABLE_NOT_FREE si la mesa no esta libre. */
  deactivate(tableId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.tablesUrl()}/${tableId}`));
  }

  updateSetting(request: UpdateSettingDTO): Promise<RestaurantSettingView> {
    return firstValueFrom(
      this.http.put<RestaurantSettingView>(this.settingsUrl(), request),
    );
  }

  private tablesUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/tables`;
  }

  private settingsUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/settings`;
  }
}
