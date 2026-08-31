/**
 * Copia literal del esquema de /v3/api-docs, en snake_case porque eso es lo que viaja
 * en el JSON. El backend de este modulo es `inventory`.
 */
import type { Paged } from '../../core/paged';

export type MeasureUnit = 'KG' | 'GRAM' | 'LITER' | 'MILLILITER' | 'UNIT';
export type MovementType = 'PURCHASE' | 'SALE' | 'WASTE' | 'ADJUSTMENT';
export type WasteReason = 'EXPIRED' | 'DAMAGED' | 'HANDLING_ERROR';

export interface SupplyCategoryView {
  supply_category_id: number;
  name: string;
  active: boolean;
}

export interface SupplyView {
  supply_id: number;
  supply_category_id: number;
  category_name: string;
  name: string;
  measure_unit: MeasureUnit;
  unit_cost: number;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  stock_value: number;
  low_stock: boolean;
  active: boolean;
}

export interface StockMovementView {
  stock_movement_id: number;
  supply_id: number;
  supply_name: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  waste_reason: WasteReason | null;
  reason: string | null;
  order_item_id: number | null;
  user_id: number;
  created_at: string;
}

export interface SupplyDetailView {
  supply: SupplyView;
  recent_movements: StockMovementView[];
}

export type PagedSupplies = Paged<SupplyView>;
export type PagedStockMovements = Paged<StockMovementView>;

export interface CreateSupplyDTO {
  supply_category_id: number;
  name: string;
  measure_unit: MeasureUnit;
  unit_cost: number;
  min_stock: number;
  max_stock: number | null;
}

export interface UpdateSupplyDTO {
  supply_category_id: number;
  name: string;
  measure_unit: MeasureUnit;
  min_stock: number;
  max_stock: number | null;
}

export interface RegisterStockEntryDTO {
  supply_id: number;
  quantity: number;
  purchase_cost: number;
  entry_date: string;
}

export interface RegisterStockWasteDTO {
  supply_id: number;
  quantity: number;
  waste_reason: WasteReason;
  reason: string | null;
}

export interface RegisterStockAdjustmentDTO {
  supply_id: number;
  quantity: number;
  reason: string;
}

export const MEASURE_UNITS: MeasureUnit[] = ['KG', 'GRAM', 'LITER', 'MILLILITER', 'UNIT'];

export const MEASURE_UNIT_LABELS: Record<MeasureUnit, string> = {
  KG: 'Kilogramo',
  GRAM: 'Gramo',
  LITER: 'Litro',
  MILLILITER: 'Mililitro',
  UNIT: 'Unidad',
};

/** Abreviatura para las tablas, donde el nombre completo no cabe. */
export const MEASURE_UNIT_SYMBOLS: Record<MeasureUnit, string> = {
  KG: 'kg',
  GRAM: 'g',
  LITER: 'L',
  MILLILITER: 'ml',
  UNIT: 'u',
};

export const MOVEMENT_TYPES: MovementType[] = ['PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT'];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  PURCHASE: 'Entrada',
  SALE: 'Venta',
  WASTE: 'Merma',
  ADJUSTMENT: 'Ajuste',
};

export const WASTE_REASONS: WasteReason[] = ['EXPIRED', 'DAMAGED', 'HANDLING_ERROR'];

export const WASTE_REASON_LABELS: Record<WasteReason, string> = {
  EXPIRED: 'Vencimiento',
  DAMAGED: 'Dano',
  HANDLING_ERROR: 'Error de manejo',
};
