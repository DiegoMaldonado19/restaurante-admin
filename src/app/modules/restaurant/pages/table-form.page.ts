import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { disabled, form, FormField, max, min, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { RestaurantService } from '../restaurant.service';
import { STATUS_LABELS, STATUSES, TableStatus, TableZone, ZONE_LABELS, ZONES } from '../restaurant.types';

interface TableModel {
  table_number: number;
  capacity: number;
  zone: TableZone;
  status: TableStatus;
}

/**
 * Alta y edicion en una sola pantalla (patron staff-form.page.ts). El campo "Estado
 * inicial" solo se muestra al crear (@if (!isEdit())) porque UpdateTableDTO no lleva
 * status: cambiarlo en edicion es responsabilidad exclusiva del dialogo "Cambiar
 * estado" de table-list.page.ts (§5.6 del analisis). Se deshabilita en vez de quitarse
 * del modelo para que Signal Forms no valide un campo que no se va a enviar.
 */
@Component({
  selector: 'app-table-form',
  imports: [FormField, RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <a routerLink="/restaurante" class="text-sm text-[#1F2422]/50 hover:text-[#1F2422]">
          ← Volver a mesas
        </a>
        <h1 class="mt-2 text-2xl font-semibold text-[#1F2422]">
          {{ isEdit() ? 'Editar mesa' : 'Nueva mesa' }}
        </h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">
          {{
            isEdit()
              ? 'Cambia numero, capacidad o zona de la mesa'
              : 'Registra una mesa nueva del restaurante'
          }}
        </p>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-lg">
        <form class="space-y-5" (submit)="onSubmit($event)">
          <label class="block">
            <span class="text-sm font-medium text-[#1F2422]">
              Numero de mesa <span class="text-[#B5482A]">*</span>
            </span>
            <input
              type="number"
              class="mt-1.5 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="tableForm.table_number"
            />
            @if (tableForm.table_number().touched() && tableForm.table_number().invalid()) {
              @for (error of tableForm.table_number().errors(); track error.kind) {
                <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
              }
            }
          </label>

          <label class="block">
            <span class="text-sm font-medium text-[#1F2422]">
              Capacidad <span class="text-[#B5482A]">*</span>
            </span>
            <input
              type="number"
              class="mt-1.5 w-32 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="tableForm.capacity"
            />
            <span class="ml-2 text-xs text-[#1F2422]/50">personas (maximo 50)</span>
            @if (tableForm.capacity().touched() && tableForm.capacity().invalid()) {
              @for (error of tableForm.capacity().errors(); track error.kind) {
                <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
              }
            }
          </label>

          <label class="block">
            <span class="text-sm font-medium text-[#1F2422]">
              Zona <span class="text-[#B5482A]">*</span>
            </span>
            <select
              class="mt-1.5 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="tableForm.zone"
            >
              @for (zone of zones; track zone) {
                <option [value]="zone">{{ zoneLabels[zone] }}</option>
              }
            </select>
            @if (tableForm.zone().touched() && tableForm.zone().invalid()) {
              @for (error of tableForm.zone().errors(); track error.kind) {
                <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
              }
            }
          </label>

          @if (!isEdit()) {
            <label class="block">
              <span class="text-sm font-medium text-[#1F2422]">
                Estado inicial <span class="text-[#B5482A]">*</span>
              </span>
              <select
                class="mt-1.5 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                [formField]="tableForm.status"
              >
                @for (status of statuses; track status) {
                  <option [value]="status">{{ statusLabels[status] }}</option>
                }
              </select>
            </label>
          } @else {
            <p class="rounded-lg bg-[#1F2422]/5 px-3 py-2 text-sm text-[#1F2422]/60">
              El estado de la mesa se cambia desde "Cambiar estado" en el listado, no aqui.
            </p>
          }

          @if (failure(); as message) {
            <div class="rounded-lg bg-[#B5482A]/5 border border-[#B5482A]/20 px-3 py-2">
              <p class="text-sm text-[#B5482A]">{{ message }}</p>
            </div>
          }

          <div class="flex items-center gap-3 pt-1">
            <button
              type="submit"
              [disabled]="tableForm().invalid() || tableForm().submitting()"
              class="rounded-lg bg-[#2F6F5E] px-5 py-2.5 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
            >
              Guardar
            </button>
            <a routerLink="/restaurante" class="text-sm text-[#1F2422]/60 hover:text-[#1F2422]">
              Cancelar
            </a>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class TableFormPage implements OnInit {
  /** Viene de la ruta /restaurante/:id. Ausente al dar de alta. */
  readonly id = input<string>();

  private readonly restaurant = inject(RestaurantService);
  private readonly router = inject(Router);

  protected readonly zones = ZONES;
  protected readonly zoneLabels = ZONE_LABELS;
  protected readonly statuses = STATUSES;
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly failure = signal<string | null>(null);

  protected readonly model = signal<TableModel>({
    table_number: 1,
    capacity: 4,
    zone: 'SALON',
    status: 'FREE',
  });

  protected readonly tableForm = form(this.model, (path) => {
    required(path.table_number, { message: 'El numero de mesa es obligatorio' });
    min(path.table_number, 1, { message: 'El numero de mesa debe ser mayor a 0' });

    required(path.capacity, { message: 'La capacidad es obligatoria' });
    min(path.capacity, 1, { message: 'La capacidad debe ser mayor a 0' });
    max(path.capacity, 50, { message: 'La capacidad no puede superar 50 personas' });

    required(path.zone, { message: 'Elija una zona' });

    // Al editar, el estado lo cambia solo el dialogo del listado (§5.6 del analisis).
    disabled(path.status, { when: () => this.isEdit() });
    required(path.status, { message: 'Elija un estado inicial' });
  });

  /**
   * ngOnInit, no el constructor: un input() de tipo senal (`id`) solo tiene garantizado
   * su valor real a partir de ngOnInit — en el constructor todavia puede leerse
   * undefined aunque la ruta ya tenga :id, porque el router hace `setInput()' despues
   * de que Angular construye la instancia. Leer this.id() en el constructor es la causa
   * de un bug real que se encontro en esta sesion: la pantalla de edicion se quedaba con
   * los valores por defecto del formulario en vez de los datos reales de la mesa.
   */
  ngOnInit(): void {
    void this.loadWhenEditing();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.failure.set(null);

    submit(this.tableForm, {
      action: async () => {
        const value = this.model();
        const tableId = this.id();

        try {
          if (tableId !== undefined) {
            await this.restaurant.update(Number(tableId), {
              table_number: Number(value.table_number),
              capacity: Number(value.capacity),
              zone: value.zone,
            });
          } else {
            await this.restaurant.create({
              table_number: Number(value.table_number),
              capacity: Number(value.capacity),
              zone: value.zone,
              status: value.status,
            });
          }

          this.restaurant.tables.reload();
          await this.router.navigate(['/restaurante']);
        } catch (error) {
          // 409 TABLE_NUMBER_TAKEN llega aqui: el formulario no puede prevenirlo, otra
          // persona pudo dar de alta el mismo numero entre que se abrio la pantalla y
          // se envio el formulario.
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }

  private async loadWhenEditing(): Promise<void> {
    const tableId = this.id();

    if (tableId === undefined) {
      return;
    }

    try {
      const table = await this.restaurant.findById(Number(tableId));

      this.model.set({
        table_number: table.table_number,
        capacity: table.capacity,
        zone: table.zone,
        status: table.status,
      });
    } catch (error) {
      this.failure.set(messageFor(error));
    }
  }
}
