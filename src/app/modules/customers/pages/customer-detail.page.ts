import { Component, inject, input, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatDateTime } from '../../../core/format';
import { CustomersService } from '../customers.service';
import { CustomerDetailView, LOYALTY_TYPE_LABELS, LoyaltyTransactionView } from '../customers.types';

interface CustomerModel {
  full_name: string;
  phone: string;
}

/**
 * Ficha del cliente: puntos disponibles, visitas e historial del libro mayor.
 * El consumo acumulado vive en invoice.total, de billing, y se agrega cuando ese
 * modulo exista. Los puntos no se editan aqui: solo se mueven dentro de POST /invoices.
 */
@Component({
  selector: 'app-customer-detail',
  imports: [FormField, RouterLink],
  template: `
    <section class="max-w-3xl space-y-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-slate-900">{{ customer()?.full_name ?? 'Cliente' }}</h1>
        <a routerLink="/clientes" class="text-sm text-slate-600 underline">Volver al listado</a>
      </header>

      @if (failure()) {
        <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ failure() }}</p>
      }

      @if (customer(); as detail) {
        <div class="grid grid-cols-3 gap-4">
          <div class="rounded-xl bg-white p-4 shadow">
            <p class="text-sm text-slate-500">Puntos disponibles</p>
            <p class="text-3xl font-semibold text-slate-900">{{ detail.available_points }}</p>
          </div>
          <div class="rounded-xl bg-white p-4 shadow">
            <p class="text-sm text-slate-500">Visitas</p>
            <p class="text-3xl font-semibold text-slate-900">{{ detail.visit_count }}</p>
          </div>
          <div class="rounded-xl bg-white p-4 shadow">
            <p class="text-sm text-slate-500">Cliente desde</p>
            <p class="text-lg font-medium text-slate-900">{{ asDateTime(detail.created_at) }}</p>
          </div>
        </div>

        <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
          <h2 class="text-lg font-semibold text-slate-900">Datos del cliente</h2>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Nombre completo</span>
            <input
              type="text"
              [formField]="customerForm.full_name"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (customerForm.full_name().touched() && customerForm.full_name().invalid()) {
              @for (error of customerForm.full_name().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Telefono</span>
            <input
              type="tel"
              [formField]="customerForm.phone"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (customerForm.phone().touched() && customerForm.phone().invalid()) {
              @for (error of customerForm.phone().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>

          @if (feedback(); as message) {
            <p role="alert" class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {{ message }}
            </p>
          }

          <div class="flex justify-end">
            <button
              type="submit"
              [disabled]="customerForm().invalid() || customerForm().submitting()"
              class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Guardar cambios
            </button>
          </div>
        </form>

        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-slate-900">Historial de puntos</h2>
          <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
            <thead class="bg-slate-50 text-left text-slate-600">
              <tr>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Movimiento</th>
                <th class="px-4 py-3 text-right">Puntos</th>
                <th class="px-4 py-3 text-right">Factura</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of transactions(); track entry.loyalty_transaction_id) {
                <tr class="border-t border-slate-100">
                  <td class="px-4 py-3 text-slate-500">{{ asDateTime(entry.created_at) }}</td>
                  <td class="px-4 py-3">{{ typeLabels[entry.transaction_type] }}</td>
                  <td
                    class="px-4 py-3 text-right font-medium"
                    [class]="entry.points < 0 ? 'text-red-600' : 'text-emerald-700'"
                  >
                    {{ entry.points }}
                  </td>
                  <td class="px-4 py-3 text-right text-slate-500">{{ entry.invoice_id ?? '-' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-6 text-center text-slate-500">
                    El cliente todavia no acumula ni ha redimido puntos.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class CustomerDetailPage {
  /** Viene de la ruta /clientes/:id. */
  readonly id = input.required<string>();

  private readonly customersService = inject(CustomersService);

  protected readonly typeLabels = LOYALTY_TYPE_LABELS;
  protected readonly asDateTime = formatDateTime;

  protected readonly customer = signal<CustomerDetailView | null>(null);
  protected readonly transactions = signal<LoyaltyTransactionView[]>([]);
  protected readonly feedback = signal<string | null>(null);
  protected readonly failure = signal<string | null>(null);

  protected readonly model = signal<CustomerModel>({ full_name: '', phone: '' });

  protected readonly customerForm = form(this.model, (path) => {
    required(path.full_name, { message: 'El nombre del cliente es obligatorio' });
    required(path.phone, { message: 'El telefono es obligatorio' });
  });

  constructor() {
    void this.load();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.feedback.set(null);
    this.failure.set(null);

    submit(this.customerForm, {
      action: async () => {
        try {
          await this.customersService.update(Number(this.id()), this.model());
          this.customersService.customers.reload();
          this.feedback.set('Datos actualizados.');
          await this.load();
        } catch (error) {
          // CUSTOMER_PHONE_TAKEN llega como 409: el telefono es la clave natural.
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }

  private async load(): Promise<void> {
    try {
      const customerId = Number(this.id());
      const detail = await this.customersService.findById(customerId);
      const history = await this.customersService.loyaltyTransactions(customerId);

      this.customer.set(detail);
      this.transactions.set(history.content);
      this.model.set({ full_name: detail.full_name, phone: detail.phone });
    } catch (error) {
      this.failure.set(messageFor(error));
    }
  }
}
