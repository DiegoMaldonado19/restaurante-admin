import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  ComboDetailView,
  ComboView,
  CreateComboDTO,
  CreateDishDTO,
  CreateModifierDTO,
  DishCategoryDTO,
  DishCategoryView,
  DishDetailView,
  DishView,
  ModifierView,
  PagedDishes,
  UpdateComboDTO,
  UpdateDishDTO,
  UpdateModifierDTO,
} from './menu.types';

/**
 * Llamadas HTTP del modulo menu (backend `menu`): platillos, categorias de platillo,
 * modificadores y combos. Las recetas y el costo se leen dentro de la ficha del platillo
 * (DishDetailView), pero su edicion pertenece al modulo `recipes`.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);

  // Filtros del catalogo de platillos: los lee la funcion de `dishes`.
  readonly categoryFilter = signal<number | ''>('');
  readonly search = signal('');
  readonly activeOnly = signal(false);
  readonly availableOnly = signal(false);

  readonly comboActiveFilter = signal<boolean | ''>('');

  /** Se re-pide solo cuando cambia alguno de los filtros leidos dentro de la funcion. */
  readonly dishes = httpResource<PagedDishes>(() => {
    const params = new URLSearchParams();

    if (this.categoryFilter()) {
      params.set('category_id', String(this.categoryFilter()));
    }
    if (this.search().trim()) {
      params.set('search', this.search().trim());
    }
    if (this.activeOnly()) {
      params.set('active', 'true');
    }
    if (this.availableOnly()) {
      params.set('available', 'true');
    }

    return `${this.dishesUrl()}?${params.toString()}`;
  });

  readonly categories = httpResource<DishCategoryView[]>(() => this.categoriesUrl());

  /**
   * Lista completa de platillos activos para los selectores del combo. Es aparte de
   * `dishes` porque esa va filtrada y paginada por el catalogo, y un desplegable que solo
   * ofrece la pagina visible es un error dificil de ver. Tope de 100 (maximo de pagina del
   * backend); si el menu pasa de 100 platillos, esto se cambia por un autocompletado.
   */
  readonly dishPicker = httpResource<PagedDishes>(
    () => `${this.dishesUrl()}?active=true&size=100&sort=name,asc`,
  );

  readonly combos = httpResource<ComboView[]>(() => {
    const params = new URLSearchParams();

    if (this.comboActiveFilter() !== '') {
      params.set('active', String(this.comboActiveFilter()));
    }

    return `${this.combosUrl()}?${params.toString()}`;
  });

  // --- Platillos ------------------------------------------------------------
  findDish(dishId: number): Promise<DishDetailView> {
    return firstValueFrom(this.http.get<DishDetailView>(`${this.dishesUrl()}/${dishId}`));
  }

  createDish(request: CreateDishDTO): Promise<DishView> {
    return firstValueFrom(this.http.post<DishView>(this.dishesUrl(), request));
  }

  updateDish(dishId: number, request: UpdateDishDTO): Promise<DishView> {
    return firstValueFrom(this.http.put<DishView>(`${this.dishesUrl()}/${dishId}`, request));
  }

  /** La disponibilidad manual tiene su propio endpoint: el PUT del platillo no la toca. */
  changeDishAvailability(dishId: number, manualAvailable: boolean): Promise<DishView> {
    return firstValueFrom(
      this.http.patch<DishView>(`${this.dishesUrl()}/${dishId}/availability`, {
        manual_available: manualAvailable,
      }),
    );
  }

  /** Baja logica: hay comandas y facturas historicas que referencian el platillo. */
  deleteDish(dishId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.dishesUrl()}/${dishId}`));
  }

  // --- Categorias -----------------------------------------------------------
  createCategory(request: DishCategoryDTO): Promise<DishCategoryView> {
    return firstValueFrom(this.http.post<DishCategoryView>(this.categoriesUrl(), request));
  }

  updateCategory(categoryId: number, request: DishCategoryDTO): Promise<DishCategoryView> {
    return firstValueFrom(
      this.http.put<DishCategoryView>(`${this.categoriesUrl()}/${categoryId}`, request),
    );
  }

  deactivateCategory(categoryId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.categoriesUrl()}/${categoryId}`));
  }

  // --- Modificadores --------------------------------------------------------
  modifiersOf(dishId: number): Promise<ModifierView[]> {
    return firstValueFrom(
      this.http.get<ModifierView[]>(`${this.dishesUrl()}/${dishId}/modifiers`),
    );
  }

  createModifier(dishId: number, request: CreateModifierDTO): Promise<ModifierView> {
    return firstValueFrom(
      this.http.post<ModifierView>(`${this.dishesUrl()}/${dishId}/modifiers`, request),
    );
  }

  updateModifier(modifierId: number, request: UpdateModifierDTO): Promise<ModifierView> {
    return firstValueFrom(
      this.http.put<ModifierView>(`${this.modifiersUrl()}/${modifierId}`, request),
    );
  }

  deleteModifier(modifierId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.modifiersUrl()}/${modifierId}`));
  }

  // --- Combos ---------------------------------------------------------------
  findCombo(comboId: number): Promise<ComboDetailView> {
    return firstValueFrom(this.http.get<ComboDetailView>(`${this.combosUrl()}/${comboId}`));
  }

  createCombo(request: CreateComboDTO): Promise<ComboDetailView> {
    return firstValueFrom(this.http.post<ComboDetailView>(this.combosUrl(), request));
  }

  updateCombo(comboId: number, request: UpdateComboDTO): Promise<ComboDetailView> {
    return firstValueFrom(
      this.http.put<ComboDetailView>(`${this.combosUrl()}/${comboId}`, request),
    );
  }

  changeComboStatus(comboId: number, active: boolean): Promise<ComboView> {
    return firstValueFrom(
      this.http.patch<ComboView>(`${this.combosUrl()}/${comboId}/status`, { active }),
    );
  }

  private dishesUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/dishes`;
  }

  private categoriesUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/dish-categories`;
  }

  private modifiersUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/modifiers`;
  }

  private combosUrl(): string {
    return `${this.api.apiBaseUrl}/api/v1/combos`;
  }
}
