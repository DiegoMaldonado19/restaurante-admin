import { Component, effect, inject, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { RestaurantService } from '../restaurant.service';

interface TaxModel {
  tax_percent: number;
  tip_suggested_percent: number;
}

/**
 * Editor de 2 de las 4 columnas de la fila unica de configuracion (§5.7 del analisis).
 * No expone points_per_currency_unit ni currency_per_point: son la preocupacion de
 * "Programa de puntos" (loyalty-settings.page.ts). Como PUT /settings reemplaza la fila
 * completa, el envio siempre toma esos dos valores del recurso ya cargado
 * (restaurant.setting.value()) para no pisarlos.
 */
@Component({
  selector: 'app-tax-settings',
  imports: [FormField, RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <a routerLink="/restaurante" class="text-sm text-[#1F2422]/50 hover:text-[#1F2422]">
          ← Volver a mesas
        </a>
        <h1 class="mt-2 text-2xl font-semibold text-[#1F2422]">Impuestos y propina</h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">
          Configura el impuesto que se aplica en cada factura y la propina que se sugiere al cobrar
        </p>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-lg">
        @if (restaurant.setting.isLoading() && !restaurant.setting.value()) {
          <p class="text-[#1F2422]/60">Cargando configuracion...</p>
        } @else if (restaurant.setting.error()) {
          <p class="text-[#B5482A]">{{ loadErrorMessage() }}</p>
        } @else {
          <form class="space-y-5" (submit)="onSubmit($event)">
            <label class="block">
              <span class="text-sm font-medium text-[#1F2422]">
                Impuesto (IVA) % <span class="text-[#B5482A]">*</span>
              </span>
              <input
                type="number"
                step="0.01"
                class="mt-1.5 w-32 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                [formField]="taxForm.tax_percent"
              />
              @if (taxForm.tax_percent().touched() && taxForm.tax_percent().invalid()) {
                @for (error of taxForm.tax_percent().errors(); track error.kind) {
                  <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
                }
              }
              <p class="mt-1.5 text-xs text-[#1F2422]/50">
                Se aplica en cada factura que emite restaurante-ops.
              </p>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-[#1F2422]">
                Propina sugerida % <span class="text-[#B5482A]">*</span>
              </span>
              <input
                type="number"
                step="0.01"
                class="mt-1.5 w-32 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                [formField]="taxForm.tip_suggested_percent"
              />
              @if (taxForm.tip_suggested_percent().touched() && taxForm.tip_suggested_percent().invalid()) {
                @for (error of taxForm.tip_suggested_percent().errors(); track error.kind) {
                  <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
                }
              }
              <p class="mt-1.5 text-xs text-[#1F2422]/50">
                Es la referencia que ve el cajero al cobrar; el cliente puede ajustarla.
              </p>
            </label>

            @if (feedback(); as message) {
              <div class="rounded-lg bg-[#2F6F5E]/5 border border-[#2F6F5E]/20 px-3 py-2">
                <p class="text-sm text-[#2F6F5E]">{{ message }}</p>
              </div>
            }
            @if (failure(); as message) {
              <div class="rounded-lg bg-[#B5482A]/5 border border-[#B5482A]/20 px-3 py-2">
                <p class="text-sm text-[#B5482A]">{{ message }}</p>
              </div>
            }

            <div class="flex items-center gap-3 pt-1">
              <button
                type="submit"
                [disabled]="taxForm().invalid() || taxForm().submitting()"
                class="rounded-lg bg-[#2F6F5E] px-5 py-2.5 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
              >
                Guardar
              </button>
              <a
                routerLink="/restaurante/puntos"
                class="text-sm text-[#1F2422]/60 hover:text-[#1F2422]"
              >
                Ir a Programa de puntos →
              </a>
            </div>
          </form>
        }
      </section>
    </div>
  `,
})
export class TaxSettingsPage {
  protected readonly restaurant = inject(RestaurantService);

  protected readonly feedback = signal<string | null>(null);
  protected readonly failure = signal<string | null>(null);

  protected readonly model = signal<TaxModel>({
    tax_percent: 0,
    tip_suggested_percent: 0,
  });

  protected readonly taxForm = form(this.model, (path) => {
    required(path.tax_percent, { message: 'El impuesto es obligatorio' });
    min(path.tax_percent, 0, { message: 'El impuesto no puede ser negativo' });

    required(path.tip_suggested_percent, { message: 'La propina sugerida es obligatoria' });
    min(path.tip_suggested_percent, 0, { message: 'La propina sugerida no puede ser negativa' });
  });

  constructor() {
    // Sincroniza el formulario cada vez que llega/cambia la fila real (carga inicial y
    // tras guardar). El efecto reacciona a la senal del httpResource, no a un input()
    // de ruta, asi que no aplica el bug de ngOnInit que se encontro en table-form.page.ts.
    effect(() => {
      const setting = this.restaurant.setting.value();

      if (setting === undefined) {
        return;
      }

      this.model.set({
        tax_percent: setting.tax_percent,
        tip_suggested_percent: setting.tip_suggested_percent,
      });
    });
  }

  protected loadErrorMessage(): string {
    return messageFor(this.restaurant.setting.error());
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.failure.set(null);
    this.feedback.set(null);

    submit(this.taxForm, {
      action: async () => {
        // Toma points_per_currency_unit y currency_per_point del recurso ya cargado
        // para no pisarlos: PUT /settings reemplaza la fila completa (§5.7 del analisis).
        const current = this.restaurant.setting.value();

        if (current === undefined) {
          return undefined;
        }

        const value = this.model();

        try {
          await this.restaurant.updateSetting({
            tax_percent: Number(value.tax_percent),
            tip_suggested_percent: Number(value.tip_suggested_percent),
            points_per_currency_unit: current.points_per_currency_unit,
            currency_per_point: current.currency_per_point,
          });

          this.restaurant.setting.reload();
          this.feedback.set('Impuesto y propina sugerida actualizados.');
        } catch (error) {
          // 400 VALIDATION_ERROR llega aqui si el backend rechaza un valor fuera de
          // rango que el formulario no atrapo (§7 del analisis).
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }
}
