import { HttpClient, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, signal, PLATFORM_ID} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../../api-config';
import {
  CreateCustomerDTO,
  CustomerDetailView,
  CustomerView,
  PagedCustomers,
  PagedLoyaltyTransactions,
  UpdateCustomerDTO,
} from './customers.types';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  /** En el servidor no hay token, y prerenderizar sin el deja la pantalla en estado de error. */
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly search = signal('');

  readonly customers = httpResource<PagedCustomers>(() => {
    if (!this.isBrowser) return undefined;
    const params = new URLSearchParams();

    if (this.search().trim()) {
      params.set('search', this.search().trim());
    }

    return `${this.base()}?${params.toString()}`;
  });

  findById(customerId: number): Promise<CustomerDetailView> {
    return firstValueFrom(this.http.get<CustomerDetailView>(`${this.base()}/${customerId}`));
  }

  loyaltyTransactions(customerId: number): Promise<PagedLoyaltyTransactions> {
    return firstValueFrom(
      this.http.get<PagedLoyaltyTransactions>(`${this.base()}/${customerId}/loyalty-transactions`),
    );
  }

  create(request: CreateCustomerDTO): Promise<CustomerView> {
    return firstValueFrom(this.http.post<CustomerView>(this.base(), request));
  }

  update(customerId: number, request: UpdateCustomerDTO): Promise<CustomerView> {
    return firstValueFrom(
      this.http.put<CustomerView>(`${this.base()}/${customerId}`, request),
    );
  }

  private base(): string {
    return `${this.api.apiBaseUrl}/api/v1/customers`;
  }
}
