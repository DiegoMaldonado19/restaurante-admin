import { HttpClient, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, signal, PLATFORM_ID} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  CreateSupplyDTO,
  MovementType,
  PagedStockMovements,
  PagedSupplies,
  RegisterStockAdjustmentDTO,
  RegisterStockEntryDTO,
  RegisterStockWasteDTO,
  StockMovementView,
  SupplyCategoryView,
  SupplyDetailView,
  SupplyView,
  UpdateSupplyDTO,
} from './inventory.types';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  /** En el servidor no hay token, y prerenderizar sin el deja la pantalla en estado de error. */
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly categoryFilter = signal<number | ''>('');
  readonly search = signal('');
  readonly lowStockOnly = signal(false);

  readonly kardexSupply = signal<number | ''>('');
  readonly kardexType = signal<MovementType | ''>('');
  readonly kardexFrom = signal('');
  readonly kardexTo = signal('');

  /** Se re-pide solo cuando cambia alguno de los filtros leidos dentro de la funcion. */
  readonly supplies = httpResource<PagedSupplies>(() => {
    if (!this.isBrowser) return undefined;
    const params = new URLSearchParams();

    if (this.categoryFilter()) {
      params.set('category_id', String(this.categoryFilter()));
    }
    if (this.search().trim()) {
      params.set('search', this.search().trim());
    }
    if (this.lowStockOnly()) {
      params.set('low_stock', 'true');
    }

    return `${this.suppliesUrl()}?${params.toString()}`;
  });

  /**
   * Lista para los desplegables de entrada, merma, ajuste y kardex. Es aparte de
   * `supplies` porque esa va filtrada y paginada por el catalogo, y un desplegable
   * que solo ofrece la pagina visible es un error dificil de ver.
   * ponytail: tope de 100, que es el maximo de pagina del backend. Si el restaurante
   * pasa de 100 insumos, esto se cambia por un campo de busqueda con autocompletado.
   */
  readonly pickerSupplies = httpResource<PagedSupplies>(() =>
    this.isBrowser ? `${this.suppliesUrl()}?active=true&size=100&sort=name,asc` : undefined,
  );

  readonly categories = httpResource<SupplyCategoryView[]>(
    () => (this.isBrowser ? `${this.api.apiBaseUrl}/api/v1/supply-categories` : undefined),
  );

  readonly kardex = httpResource<PagedStockMovements>(() => {
    if (!this.isBrowser) return undefined;
    const params = new URLSearchParams();   // el orden descendente lo pone el endpoint

    if (this.kardexSupply()) {
      params.set('supply_id', String(this.kardexSupply()));
    }
    if (this.kardexType()) {
      params.set('movement_type', this.kardexType());
    }
    // El backend espera ISO con hora; el <input type="date"> solo da la fecha.
    if (this.kardexFrom()) {
      params.set('from', `${this.kardexFrom()}T00:00:00`);
    }
    if (this.kardexTo()) {
      params.set('to', `${this.kardexTo()}T23:59:59`);
    }

    return `${this.api.apiBaseUrl}/api/v1/stock-movements?${params.toString()}`;
  });

  findById(supplyId: number): Promise<SupplyDetailView> {
    return firstValueFrom(this.http.get<SupplyDetailView>(`${this.suppliesUrl()}/${supplyId}`));
  }

  create(request: CreateSupplyDTO): Promise<SupplyView> {
    return firstValueFrom(this.http.post<SupplyView>(this.suppliesUrl(), request));
  }

  update(supplyId: number, request: UpdateSupplyDTO): Promise<SupplyView> {
    return firstValueFrom(this.http.put<SupplyView>(`${this.suppliesUrl()}/${supplyId}`, request));
  }

  /** No se borra un insumo: el kardex y las recetas lo referencian. */
  changeStatus(supplyId: number, active: boolean): Promise<SupplyView> {
    return firstValueFrom(
      this.http.patch<SupplyView>(`${this.suppliesUrl()}/${supplyId}/status`, { active }),
    );
  }

  registerEntry(request: RegisterStockEntryDTO): Promise<StockMovementView> {
    return this.postMovement('stock-entries', request);
  }

  registerWaste(request: RegisterStockWasteDTO): Promise<StockMovementView> {
    return this.postMovement('stock-wastes', request);
  }

  registerAdjustment(request: RegisterStockAdjustmentDTO): Promise<StockMovementView> {
    return this.postMovement('stock-adjustments', request);
  }

  createCategory(name: string): Promise<SupplyCategoryView> {
    return firstValueFrom(this.http.post<SupplyCategoryView>(this.categoriesUrl(), { name }));
  }

  renameCategory(categoryId: number, name: string): Promise<SupplyCategoryView> {
    return firstValueFrom(
      this.http.put<SupplyCategoryView>(`${this.categoriesUrl()}/${categoryId}`, { name }),
    );
  }

  deactivateCategory(categoryId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.categoriesUrl()}/${categoryId}`));
  }

  /** Los tres movimientos comparten respuesta y difieren solo en la ruta y el cuerpo. */
  private postMovement(path: string, body: unknown): Promise<StockMovementView> {
    return firstValueFrom(
      this.http.post<StockMovementView>(`${this.api.apiBaseUrl}/api/v1/${path}`, body),
    );
  }

  private suppliesUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/supplies`;
  }

  private categoriesUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/supply-categories`;
  }
}
