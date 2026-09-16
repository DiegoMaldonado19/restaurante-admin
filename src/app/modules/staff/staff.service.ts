import { HttpClient, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, signal, PLATFORM_ID} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  CreateUserDTO,
  PagedUsers,
  UpdateUserDTO,
  UserRole,
  UserStatus,
  UserView,
} from './staff.types';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  /** En el servidor no hay token, y prerenderizar sin el deja la pantalla en estado de error. */
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly roleFilter = signal<UserRole | ''>('');
  readonly statusFilter = signal<UserStatus | ''>('');
  readonly search = signal('');

  /** Se re-pide solo cuando cambia alguno de los filtros leidos dentro de la funcion. */
  readonly staff = httpResource<PagedUsers>(() => {
    if (!this.isBrowser) return undefined;
    const params = new URLSearchParams();

    if (this.roleFilter()) {
      params.set('role', this.roleFilter());
    }
    if (this.statusFilter()) {
      params.set('status', this.statusFilter());
    }
    if (this.search().trim()) {
      params.set('search', this.search().trim());
    }

    return `${this.base()}?${params.toString()}`;
  });

  findById(userId: number): Promise<UserView> {
    return firstValueFrom(this.http.get<UserView>(`${this.base()}/${userId}`));
  }

  create(request: CreateUserDTO): Promise<UserView> {
    return firstValueFrom(this.http.post<UserView>(this.base(), request));
  }

  update(userId: number, request: UpdateUserDTO): Promise<UserView> {
    return firstValueFrom(this.http.put<UserView>(`${this.base()}/${userId}`, request));
  }

  /** Nunca se borra un empleado: hay cuentas, comandas y facturas que lo referencian. */
  changeStatus(userId: number, status: UserStatus): Promise<UserView> {
    return firstValueFrom(
      this.http.patch<UserView>(`${this.base()}/${userId}/status`, { status }),
    );
  }

  resetPassword(userId: number, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`${this.base()}/${userId}/password`, { new_password: newPassword }),
    );
  }

  private base(): string {
    return `${this.api.apiBaseUrl}/api/v1/users`;
  }
}
