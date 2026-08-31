/** Copia literal del esquema de /v3/api-docs. El backend de este modulo es `customer`. */
import type { Paged } from '../../core/paged';

export type LoyaltyTransactionType = 'ACCRUAL' | 'REDEMPTION';

export interface CustomerView {
  customer_id: number;
  full_name: string;
  phone: string;
  created_at: string;
}

export interface CustomerDetailView {
  customer_id: number;
  full_name: string;
  phone: string;
  created_at: string;
  available_points: number;
  visit_count: number;
}

export interface LoyaltyTransactionView {
  loyalty_transaction_id: number;
  transaction_type: LoyaltyTransactionType;
  points: number;
  invoice_id: number | null;
  created_at: string;
}

export type PagedCustomers = Paged<CustomerView>;
export type PagedLoyaltyTransactions = Paged<LoyaltyTransactionView>;

export interface CreateCustomerDTO {
  full_name: string;
  phone: string;
}

export interface UpdateCustomerDTO {
  full_name: string;
  phone: string;
}

export const LOYALTY_TYPE_LABELS: Record<LoyaltyTransactionType, string> = {
  ACCRUAL: 'Acreditacion',
  REDEMPTION: 'Redencion',
};
