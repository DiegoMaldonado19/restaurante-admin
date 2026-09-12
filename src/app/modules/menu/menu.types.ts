/**
 * Copia literal del esquema de /v3/api-docs, en snake_case porque eso es lo que viaja
 * en el JSON. El backend de este modulo es `menu`.
 */
import type { Paged } from '../../core/paged';

// --- Categorias de platillo -------------------------------------------------
export interface DishCategoryView {
  dish_category_id: number;
  name: string;
  display_order: number;
  active: boolean;
}

export interface DishCategoryDTO {
  name: string;
  display_order: number;
}

// --- Platillos --------------------------------------------------------------
export interface DishView {
  dish_id: number;
  dish_category_id: number;
  category_name: string;
  name: string;
  description: string | null;
  sale_price: number;
  image_url: string | null;
  prep_minutes: number;
  manual_available: boolean;
  /** available = bandera manual Y stock suficiente; lo deriva el backend. */
  available: boolean;
  active: boolean;
}

export interface DishDetailView {
  dish_id: number;
  dish_category_id: number;
  category_name: string;
  name: string;
  description: string | null;
  sale_price: number;
  image_url: string | null;
  prep_minutes: number;
  manual_available: boolean;
  available: boolean;
  /** null si el platillo aun no tiene receta vigente (costo indefinido). */
  production_cost: number | null;
  margin_percent: number | null;
  active: boolean;
  recipe: RecipeView | null;
}

export interface CreateDishDTO {
  dish_category_id: number;
  name: string;
  description: string | null;
  sale_price: number;
  image_url: string | null;
  prep_minutes: number;
}

export type UpdateDishDTO = CreateDishDTO;

export interface UpdateDishAvailabilityDTO {
  manual_available: boolean;
}

// --- Modificadores ----------------------------------------------------------
export interface ModifierView {
  dish_modifier_id: number;
  dish_id: number;
  name: string;
  extra_price: number;
  active: boolean;
}

export interface CreateModifierDTO {
  name: string;
  extra_price: number;
}

export type UpdateModifierDTO = CreateModifierDTO;

// --- Combos -----------------------------------------------------------------
export interface ComboView {
  combo_id: number;
  name: string;
  description: string | null;
  combo_price: number;
  active: boolean;
}

export interface ComboItemView {
  dish_id: number;
  dish_name: string;
  sale_price: number;
  quantity: number;
}

export interface ComboDetailView {
  combo_id: number;
  name: string;
  description: string | null;
  combo_price: number;
  active: boolean;
  items_total: number;
  savings: number;
  items: ComboItemView[];
}

export interface ComboItemDTO {
  dish_id: number;
  quantity: number;
}

export interface CreateComboDTO {
  name: string;
  description: string | null;
  combo_price: number;
  items: ComboItemDTO[];
}

export type UpdateComboDTO = CreateComboDTO;

export interface UpdateComboStatusDTO {
  active: boolean;
}

// --- Recetas (lectura desde este modulo; edicion en `recipes`) --------------
export interface RecipeItemView {
  supply_id: number;
  quantity: number;
  unit_cost: number;
  line_cost: number;
}

export interface RecipeView {
  recipe_id: number;
  version: number;
  effective_from: string;
  production_cost: number;
  items: RecipeItemView[];
}

// --- Paginacion -------------------------------------------------------------
export type PagedDishes = Paged<DishView>;
