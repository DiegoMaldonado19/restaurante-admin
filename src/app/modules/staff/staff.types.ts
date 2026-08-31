/**
 * Copia literal del esquema de /v3/api-docs, en snake_case porque eso es lo que viaja
 * en el JSON. El backend de este modulo es `iam`; aqui se llama `staff` porque
 * "gestion de empleados" es lo que el administrador ve.
 */
// El rol lo declara core/auth.service: es el mismo enum del backend y una sola
// aplicacion no puede tener dos definiciones que se desincronicen.
export type { UserRole } from '../../core/auth.service';
import type { UserRole } from '../../core/auth.service';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserView {
  user_id: number;
  full_name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface PageMetadata {
  size: number;
  number: number;
  total_elements: number;
  total_pages: number;
}

export interface PagedUsers {
  content: UserView[];
  page: PageMetadata;
}

export interface CreateUserDTO {
  full_name: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDTO {
  full_name: string;
  role: UserRole;
}

/** Los roles que se pueden dar de alta: el administrador ya existe desde la semilla. */
export const ASSIGNABLE_ROLES: UserRole[] = ['WAITER', 'KITCHEN', 'CASHIER'];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  WAITER: 'Mesero',
  KITCHEN: 'Cocina',
  CASHIER: 'Cajero',
};
