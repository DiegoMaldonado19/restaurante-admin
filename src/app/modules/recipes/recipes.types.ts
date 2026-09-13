import { RecipeItemView } from '../menu/menu.types';

/** Una version en el historial: la vigencia y el costo con que se congelaron las ventas. */
export interface RecipeVersionView {
  recipe_id: number;
  version: number;
  effective_from: string;
  effective_to: string | null;
  current: boolean;
  production_cost: number;
  items: RecipeItemView[];
}

/** El cuerpo de PUT /recipe. Reemplaza la receta vigente: el backend abre otra version. */
export interface RecipeDTO {
  items: RecipeItemDTO[];
}

export interface RecipeItemDTO {
  supply_id: number;
  quantity: number;
}
