import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatDate } from '../../../core/format';
import { CustomersService } from '../customers.service';

/**
 * Listado del programa de fidelizacion. El alta la hace el mostrador desde la aplicacion
 * de operacion: aqui el administrador consulta y corrige.
 */
@Component({
  selector: 'app-customer-list',
  imports: [RouterLink],
  template: `
    <section class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Clientes</h1>

      <div class="rounded-lg bg-white p-4 shadow">
        <input
          type="search"
          placeholder="Nombre o telefono"
          [value]="customers.search()"
          (input)="customers.search.set($any($event.target).value)"
          class="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      @if (customers.customers.isLoading()) {
        <p class="text-slate-500">Cargando clientes...</p>
      } @else if (customers.customers.error()) {
        <p class="text-red-600">{{ errorMessage() }}</p>
      } @else {
        <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Telefono</th>
              <th class="px-4 py-3">Alta</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (customer of customers.customers.value()?.content ?? []; track customer.customer_id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3 font-medium">{{ customer.full_name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ customer.phone }}</td>
                <td class="px-4 py-3 text-slate-500">{{ asDate(customer.created_at) }}</td>
                <td class="px-4 py-3">
                  <a [routerLink]="['/clientes', customer.customer_id]" class="text-slate-900 underline">
                    Ver ficha
                  </a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-6 text-center text-slate-500">
                  No hay clientes que coincidan con la busqueda.
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class CustomerListPage {
  protected readonly customers = inject(CustomersService);

  protected readonly asDate = formatDate;

  protected errorMessage(): string {
    return messageFor(this.customers.customers.error());
  }
}
