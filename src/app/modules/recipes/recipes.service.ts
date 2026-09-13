import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import { RecipeView } from '../menu/menu.types';
import { RecipeDTO, RecipeVersionView } from './recipes.types';

/**
 * Los cinco endpoints de receta (backend `menu`, RecipeController). El catalogo de
 * platillos y el de insumos no se repiten aqui: los sirven MenuService e InventoryService,
 * que ya los traen filtrados y paginados.
 */
@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);

  dishRecipe(dishId: number): Promise<RecipeView> {
    return firstValueFrom(this.http.get<RecipeView>(`${this.dishUrl(dishId)}/recipe`));
  }

  /** No edita: cierra la version vigente y abre otra, para no mover el costo ya vendido. */
  replaceDishRecipe(dishId: number, request: RecipeDTO): Promise<RecipeView> {
    return firstValueFrom(this.http.put<RecipeView>(`${this.dishUrl(dishId)}/recipe`, request));
  }

  dishRecipeVersions(dishId: number): Promise<RecipeVersionView[]> {
    return firstValueFrom(
      this.http.get<RecipeVersionView[]>(`${this.dishUrl(dishId)}/recipe-versions`),
    );
  }

  modifierRecipe(modifierId: number): Promise<RecipeView> {
    return firstValueFrom(this.http.get<RecipeView>(`${this.modifierUrl(modifierId)}/recipe`));
  }

  replaceModifierRecipe(modifierId: number, request: RecipeDTO): Promise<RecipeView> {
    return firstValueFrom(
      this.http.put<RecipeView>(`${this.modifierUrl(modifierId)}/recipe`, request),
    );
  }

  private dishUrl(dishId: number): string {
    return `${this.api.apiBaseUrl}/api/v1/dishes/${dishId}`;
  }

  private modifierUrl(modifierId: number): string {
    return `${this.api.apiBaseUrl}/api/v1/modifiers/${modifierId}`;
  }
}
