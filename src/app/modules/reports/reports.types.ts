/**
 * Copia literal del esquema de /v3/api-docs. El backend de este modulo es `report`.
 *
 * REPORT_SPECS es lo que permite que una sola pantalla sirva para los nueve reportes:
 * cada entrada declara que filtros admite, que columnas tiene y que grafica le va. Sin
 * el catalogo harian falta nueve paginas casi identicas.
 */

export interface SalesRow {
  period: string;
  invoices: number;
  units: number;
  sales: number;
  cost: number;
  margin: number;
}

export interface DishRankingRow {
  dish_id: number;
  dish_name: string;
  category_name: string;
  units: number;
  sales: number;
  cost: number;
  margin: number;
}

export interface DishProfitabilityRow {
  dish_id: number;
  dish_name: string;
  category_name: string;
  menu_price: number;
  avg_sale_price: number;
  avg_unit_cost: number;
  margin_per_unit: number;
  margin_percent: number;
  units: number;
  total_margin: number;
}

export interface InventoryRow {
  supply_id: number;
  name: string;
  category_name: string;
  measure_unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit_cost: number;
  stock_value: number;
  low_stock: boolean;
}

export interface WasteRow {
  supply_id: number;
  supply_name: string;
  category_name: string;
  waste_reason: string;
  measure_unit: string;
  quantity: number;
  lost_cost: number;
  movements: number;
}

export interface TableOccupancyRow {
  hour_slot: number;
  accounts: number;
  guests: number;
  avg_minutes: number | null;
}

export interface WaiterPerformanceRow {
  waiter_id: number;
  waiter_name: string;
  accounts: number;
  sales: number;
  tips: number;
  avg_service_minutes: number | null;
  avg_rating: number | null;
  ratings: number;
}

export interface LoyaltyRow {
  customer_id: number;
  full_name: string;
  phone: string;
  visits: number;
  points_accrued: number;
  points_redeemed: number;
  net_points: number;
}

export interface CashShiftRow {
  cash_shift_id: number;
  cashier_id: number;
  cashier_name: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  expected_cash: number | null;
  counted_cash: number | null;
  difference: number | null;
  status: string;
}

/** Cualquier fila de reporte: el backend devuelve listas planas de objetos. */
export type ReportRow = Record<string, string | number | boolean | null>;

export type ColumnFormat = 'text' | 'number' | 'money' | 'decimal' | 'percent' | 'minutes' | 'date';

export interface ReportColumn {
  key: string;
  label: string;
  format: ColumnFormat;
}

/** Los filtros que puede pintar la pantalla. Cada reporte declara los suyos. */
export type FilterKey =
  | 'range'
  | 'group_by'
  | 'order'
  | 'limit'
  | 'dish_category'
  | 'waiter'
  | 'supply_category'
  | 'zone'
  | 'low_stock_only';

export interface ReportChart {
  labelKey: string;
  valueKey: string;
  valueLabel: string;
  type: 'bar' | 'line';
}

export interface ReportSpec {
  key: string;
  label: string;
  description: string;
  filters: FilterKey[];
  columns: ReportColumn[];
  chart: ReportChart | null;
}

export const REPORT_SPECS: ReportSpec[] = [
  {
    key: 'sales',
    label: 'Ventas por periodo',
    description: 'Ventas por franja de tiempo, filtrables por categoria de platillo y por mesero.',
    filters: ['range', 'group_by', 'dish_category', 'waiter'],
    columns: [
      { key: 'period', label: 'Periodo', format: 'text' },
      { key: 'invoices', label: 'Facturas', format: 'number' },
      { key: 'units', label: 'Unidades', format: 'number' },
      { key: 'sales', label: 'Venta', format: 'money' },
      { key: 'cost', label: 'Costo', format: 'money' },
      { key: 'margin', label: 'Margen', format: 'money' },
    ],
    chart: { labelKey: 'period', valueKey: 'sales', valueLabel: 'Venta', type: 'line' },
  },
  {
    key: 'dish-ranking',
    label: 'Platillos mas y menos vendidos',
    description: 'Ordenado por unidades. Con order=bottom incluye los que no se vendieron.',
    filters: ['range', 'order', 'limit', 'dish_category'],
    columns: [
      { key: 'dish_name', label: 'Platillo', format: 'text' },
      { key: 'category_name', label: 'Categoria', format: 'text' },
      { key: 'units', label: 'Unidades', format: 'number' },
      { key: 'sales', label: 'Venta', format: 'money' },
      { key: 'cost', label: 'Costo', format: 'money' },
      { key: 'margin', label: 'Margen', format: 'money' },
    ],
    chart: { labelKey: 'dish_name', valueKey: 'units', valueLabel: 'Unidades', type: 'bar' },
  },
  {
    key: 'dish-profitability',
    label: 'Rentabilidad por platillo',
    description: 'Precio cobrado contra el costo congelado en cada linea de comanda.',
    filters: ['range', 'dish_category'],
    columns: [
      { key: 'dish_name', label: 'Platillo', format: 'text' },
      { key: 'menu_price', label: 'Precio de carta', format: 'money' },
      { key: 'avg_sale_price', label: 'Precio medio', format: 'money' },
      { key: 'avg_unit_cost', label: 'Costo medio', format: 'money' },
      { key: 'margin_per_unit', label: 'Margen unitario', format: 'money' },
      { key: 'margin_percent', label: 'Margen', format: 'percent' },
      { key: 'units', label: 'Unidades', format: 'number' },
      { key: 'total_margin', label: 'Margen total', format: 'money' },
    ],
    chart: {
      labelKey: 'dish_name',
      valueKey: 'margin_percent',
      valueLabel: 'Margen %',
      type: 'bar',
    },
  },
  {
    key: 'inventory',
    label: 'Inventario y stock bajo',
    description: 'Existencias valoradas al costo actual. No lleva rango: es una foto del momento.',
    filters: ['supply_category', 'low_stock_only'],
    columns: [
      { key: 'name', label: 'Insumo', format: 'text' },
      { key: 'category_name', label: 'Categoria', format: 'text' },
      { key: 'measure_unit', label: 'Unidad', format: 'text' },
      { key: 'current_stock', label: 'Existencia', format: 'decimal' },
      { key: 'min_stock', label: 'Minimo', format: 'decimal' },
      { key: 'unit_cost', label: 'Costo unitario', format: 'money' },
      { key: 'stock_value', label: 'Valor', format: 'money' },
    ],
    chart: { labelKey: 'name', valueKey: 'stock_value', valueLabel: 'Valor', type: 'bar' },
  },
  {
    key: 'waste',
    label: 'Mermas del periodo',
    description: 'Por insumo y motivo, con el costo perdido.',
    filters: ['range', 'supply_category'],
    columns: [
      { key: 'supply_name', label: 'Insumo', format: 'text' },
      { key: 'category_name', label: 'Categoria', format: 'text' },
      { key: 'waste_reason', label: 'Motivo', format: 'text' },
      { key: 'quantity', label: 'Cantidad', format: 'decimal' },
      { key: 'lost_cost', label: 'Costo perdido', format: 'money' },
      { key: 'movements', label: 'Movimientos', format: 'number' },
    ],
    chart: { labelKey: 'supply_name', valueKey: 'lost_cost', valueLabel: 'Costo perdido', type: 'bar' },
  },
  {
    key: 'table-occupancy',
    label: 'Ocupacion de mesas por horario',
    description: 'Cuentas y comensales por franja horaria, sobre las cuentas ya cerradas.',
    filters: ['range', 'zone'],
    columns: [
      { key: 'hour_slot', label: 'Hora', format: 'number' },
      { key: 'accounts', label: 'Cuentas', format: 'number' },
      { key: 'guests', label: 'Comensales', format: 'number' },
      { key: 'avg_minutes', label: 'Estancia media', format: 'minutes' },
    ],
    chart: { labelKey: 'hour_slot', valueKey: 'accounts', valueLabel: 'Cuentas', type: 'bar' },
  },
  {
    key: 'waiter-performance',
    label: 'Desempeno por mesero',
    description: 'Cuentas, venta, propina, tiempo medio de servicio y calificacion promedio.',
    filters: ['range'],
    columns: [
      { key: 'waiter_name', label: 'Mesero', format: 'text' },
      { key: 'accounts', label: 'Cuentas', format: 'number' },
      { key: 'sales', label: 'Venta', format: 'money' },
      { key: 'tips', label: 'Propina', format: 'money' },
      { key: 'avg_service_minutes', label: 'Servicio medio', format: 'minutes' },
      { key: 'avg_rating', label: 'Calificacion', format: 'decimal' },
      { key: 'ratings', label: 'Calificaciones', format: 'number' },
    ],
    chart: { labelKey: 'waiter_name', valueKey: 'sales', valueLabel: 'Venta', type: 'bar' },
  },
  {
    key: 'loyalty',
    label: 'Fidelizacion',
    description: 'Puntos otorgados y redimidos, y los clientes que mas visitan.',
    filters: ['range', 'limit'],
    columns: [
      { key: 'full_name', label: 'Cliente', format: 'text' },
      { key: 'phone', label: 'Telefono', format: 'text' },
      { key: 'visits', label: 'Visitas', format: 'number' },
      { key: 'points_accrued', label: 'Otorgados', format: 'number' },
      { key: 'points_redeemed', label: 'Redimidos', format: 'number' },
      { key: 'net_points', label: 'Saldo', format: 'number' },
    ],
    chart: { labelKey: 'full_name', valueKey: 'points_accrued', valueLabel: 'Puntos otorgados', type: 'bar' },
  },
  {
    key: 'cash-shifts',
    label: 'Cuadres de caja',
    description: 'Turnos del periodo con su efectivo esperado, contado y la diferencia.',
    filters: ['range'],
    columns: [
      { key: 'cashier_name', label: 'Cajero', format: 'text' },
      { key: 'opened_at', label: 'Apertura', format: 'date' },
      { key: 'closed_at', label: 'Cierre', format: 'date' },
      { key: 'opening_balance', label: 'Saldo inicial', format: 'money' },
      { key: 'expected_cash', label: 'Esperado', format: 'money' },
      { key: 'counted_cash', label: 'Contado', format: 'money' },
      { key: 'difference', label: 'Diferencia', format: 'money' },
      { key: 'status', label: 'Estado', format: 'text' },
    ],
    chart: { labelKey: 'opened_at', valueKey: 'difference', valueLabel: 'Diferencia', type: 'bar' },
  },
];

export const ZONE_LABELS: Record<string, string> = {
  SALON: 'Salon',
  TERRACE: 'Terraza',
  BAR: 'Barra',
};
