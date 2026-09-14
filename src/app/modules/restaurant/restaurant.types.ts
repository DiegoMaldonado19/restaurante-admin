/**
 * Copia literal del esquema de /v3/api-docs, en snake_case porque eso es lo que viaja
 * en el JSON. El backend de este modulo es `restaurant`.
 *
 * TableZone y TableStatus se repiten aqui y en dining.types.ts a proposito: cada modulo
 * de frontend copia del esquema, no importa de otro modulo (misma regla de aislamiento
 * que en el backend).
 */
import type { Paged } from '../../core/paged';

export type TableZone = 'SALON' | 'TERRACE' | 'BAR';
export type TableStatus = 'FREE' | 'RESERVED' | 'OCCUPIED' | 'BILL_REQUESTED';

export interface RestaurantTableView {
  restaurant_table_id: number;
  table_number: number;
  capacity: number;
  zone: TableZone;
  status: TableStatus;
}

export type PagedTables = Paged<RestaurantTableView>;

export interface CreateTableDTO {
  table_number: number;
  capacity: number;
  zone: TableZone;
  status: TableStatus;
}

export interface UpdateTableDTO {
  table_number: number;
  capacity: number;
  zone: TableZone;
}

export interface UpdateTableStatusDTO {
  status: TableStatus;
}

export interface RestaurantSettingView {
  setting_id: number;
  tax_percent: number;
  tip_suggested_percent: number;
  points_per_currency_unit: number;
  currency_per_point: number;
}

export interface UpdateSettingDTO {
  tax_percent: number;
  tip_suggested_percent: number;
  points_per_currency_unit: number;
  currency_per_point: number;
}

export const ZONES: TableZone[] = ['SALON', 'TERRACE', 'BAR'];

export const ZONE_LABELS: Record<TableZone, string> = {
  SALON: 'Salón',
  TERRACE: 'Terraza',
  BAR: 'Barra',
};

export const STATUSES: TableStatus[] = ['FREE', 'RESERVED', 'OCCUPIED', 'BILL_REQUESTED'];

export const STATUS_LABELS: Record<TableStatus, string> = {
  FREE: 'Libre',
  RESERVED: 'Reservada',
  OCCUPIED: 'Ocupada',
  BILL_REQUESTED: 'Cuenta pedida',
};

/**
 * Colores del dominio "mesa", copiados de dining/pages/floor-plan.page.ts para que la
 * misma mesa se vea con el mismo color en "Salon" y en "Mesas". Se duplican aqui en vez
 * de importarse: un modulo de frontend no importa entidades de otro (§4.4 del analisis).
 */
export const STATUS_BAR: Record<TableStatus, string> = {
  FREE: 'border-l-[#3B7A57]',
  RESERVED: 'border-l-[#C98A2E]',
  OCCUPIED: 'border-l-[#B5482A]',
  BILL_REQUESTED: 'border-l-[#B5482A]',
};

export const STATUS_DOT: Record<TableStatus, string> = {
  FREE: 'bg-[#3B7A57]',
  RESERVED: 'bg-[#C98A2E]',
  OCCUPIED: 'bg-[#B5482A]',
  BILL_REQUESTED: 'bg-[#B5482A]',
};

export const STATUS_BADGE_BG: Record<TableStatus, string> = {
  FREE: 'bg-[#3B7A57]/10 text-[#3B7A57]',
  RESERVED: 'bg-[#C98A2E]/10 text-[#C98A2E]',
  OCCUPIED: 'bg-[#B5482A]/10 text-[#B5482A]',
  BILL_REQUESTED: 'bg-[#B5482A]/10 text-[#B5482A]',
};

/**
 * Transiciones validas desde cada estado, solo para decidir que opciones ofrecer en el
 * <select> del dialogo de cambio de estado. No reemplaza la validacion del backend:
 * transitionTo() es el unico juez real (409 INVALID_TABLE_TRANSITION si se equivoca).
 */
export const VALID_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  FREE: ['RESERVED', 'OCCUPIED'],
  RESERVED: ['FREE', 'OCCUPIED'],
  OCCUPIED: ['FREE', 'BILL_REQUESTED'],
  BILL_REQUESTED: ['FREE', 'OCCUPIED'],
};
