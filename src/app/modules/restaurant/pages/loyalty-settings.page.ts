import { Component, effect, inject, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { RestaurantService } from '../restaurant.service';

interface LoyaltyModel {
  points_per_currency_unit: number;
  currency_per_point: number;
}

/**
 * Editor de las otras 2 columnas de la fila unica de configuracion (§5.8 del analisis).
 * Mismo mecanismo que tax-settings.page.ts, en direccion opuesta: el envio toma
 * tax_percent y tip_suggested_percent del recurso ya cargado para no pisarlos.
 */
@Component({
  selector: 'app-loyalty-settings',
  imports: [FormField, RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <a routerLink="/restaurante" class="text-sm text-[#1F2422]/50 hover:text-[#1F2422]">
          ← Volver a mesas
        </a>
        <h1 class="mt-2 text-2xl font-semibold text-[#1F2422]">Programa de puntos</h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">
          Configura cuantos puntos acumula el cliente y cuanto vale cada punto al redimir
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
                Puntos por quetzal gastado <span class="text-[#B5482A]">*</span>
              </span>
              <input
                type="number"
                step="0.0001"
                class="mt-1.5 w-40 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                [formField]="loyaltyForm.points_per_currency_unit"
              />
              @if (
                loyaltyForm.points_per_currency_unit().touched() &&
                loyaltyForm.points_per_currency_unit().invalid()
              ) {
                @for (error of loyaltyForm.points_per_currency_unit().errors(); track error.kind) {
                  <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
                }
              }
              <p class="mt-1.5 text-xs text-[#1F2422]/50">
                Por cada quetzal de consumo neto, el cliente acumula esta cantidad de puntos.
              </p>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-[#1F2422]">
                Valor de cada punto al redimir (Q) <span class="text-[#B5482A]">*</span>
              </span>
              <input
                type="number"
                step="0.0001"
                class="mt-1.5 w-40 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                [formField]="loyaltyForm.currency_per_point"
              />
              @if (loyaltyForm.currency_per_point().touched() && loyaltyForm.currency_per_point().invalid()) {
                @for (error of loyaltyForm.currency_per_point().errors(); track error.kind) {
                  <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
                }
              }
              <p class="mt-1.5 text-xs text-[#1F2422]/50">
                Al redimir, cada punto vale esta cantidad en quetzales de descuento.
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
                [disabled]="loyaltyForm().invalid() || loyaltyForm().submitting()"
                class="rounded-lg bg-[#2F6F5E] px-5 py-2.5 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
              >
                Guardar
              </button>
              <a
                routerLink="/restaurante/impuestos"
                class="text-sm text-[#1F2422]/60 hover:text-[#1F2422]"
              >
                Ir a Impuestos y propina →
              </a>
            </div>
          </form>
        }
      </section>
    </div>
  `,
})
export class LoyaltySettingsPage {
  protected readonly restaurant = inject(RestaurantService);

  protected readonly feedback = signal<string | null>(null);
  protected readonly failure = signal<string | null>(null);

  protected readonly model = signal<LoyaltyModel>({
    points_per_currency_unit: 0,
    currency_per_point: 0,
  });

  protected readonly loyaltyForm = form(this.model, (path) => {
    required(path.points_per_currency_unit, { message: 'Los puntos por quetzal son obligatorios' });
    min(path.points_per_currency_unit, 0, { message: 'Los puntos por quetzal no pueden ser negativos' });

    required(path.currency_per_point, { message: 'El valor de cada punto es obligatorio' });
    min(path.currency_per_point, 0, { message: 'El valor de cada punto no puede ser negativo' });
  });

  constructor() {
    // Mismo mecanismo que tax-settings.page.ts, en direccion opuesta.
    effect(() => {
      const setting = this.restaurant.setting.value();

      if (setting === undefined) {
        return;
      }

      this.model.set({
        points_per_currency_unit: setting.points_per_currency_unit,
        currency_per_point: setting.currency_per_point,
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

    submit(this.loyaltyForm, {
      action: async () => {
        // Toma tax_percent y tip_suggested_percent del recurso ya cargado para no
        // pisarlos: PUT /settings reemplaza la fila completa (§5.8 del analisis).
        const current = this.restaurant.setting.value();

        if (current === undefined) {
          return undefined;
        }

        const value = this.model();

        try {
          await this.restaurant.updateSetting({
            tax_percent: current.tax_percent,
            tip_suggested_percent: current.tip_suggested_percent,
            points_per_currency_unit: Number(value.points_per_currency_unit),
            currency_per_point: Number(value.currency_per_point),
          });

          this.restaurant.setting.reload();
          this.feedback.set('Programa de puntos actualizado.');
        } catch (error) {
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }
}
