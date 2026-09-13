import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, required, min, maxLength, submit } from '@angular/forms/signals';
import { DiningService } from '../dining.service';
import { formatDateTime } from '../../../core/format';

@Component({
  selector: 'app-reservation-form',
  imports: [FormField, RouterLink],
  template: `
    <div class="min-h-full bg-[#FAF9F6] -m-6 p-6">
      <header class="mb-8">
        <a routerLink="/reservas" class="text-sm text-[#1F2422]/50 hover:text-[#1F2422]">← Volver a reservas</a>
        <h1 class="mt-2 text-2xl font-semibold text-[#1F2422]">
          {{ isEditMode() ? 'Reprogramar reserva' : 'Nueva reserva' }}
        </h1>
        <p class="mt-1 text-sm text-[#1F2422]/60">
          {{ isEditMode() ? 'Cambia mesa, fecha, hora o número de personas' : 'Registra una reserva con los datos del cliente' }}
        </p>
      </header>

      <section class="rounded-2xl bg-white border border-[#1F2422]/10 p-6 max-w-lg">
        <form class="space-y-5" (submit)="onSubmit($event)">
          @if (!isEditMode()) {
            <label class="block">
              <span class="text-sm font-medium text-[#1F2422]">Nombre del cliente <span class="text-[#B5482A]">*</span></span>
              <input
                class="mt-1.5 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                placeholder="Ej. María López"
                [formField]="createForm.customer_name"
              />
              @if (createForm.customer_name().touched() && createForm.customer_name().invalid()) {
                @for (error of createForm.customer_name().errors(); track error) {
                  <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
                }
              }
            </label>

            <label class="block">
              <span class="text-sm font-medium text-[#1F2422]">Teléfono <span class="text-[#B5482A]">*</span></span>
              <input
                class="mt-1.5 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                placeholder="Ej. 4412 3456"
                [formField]="createForm.customer_phone"
              />
              @if (createForm.customer_phone().touched() && createForm.customer_phone().invalid()) {
                @for (error of createForm.customer_phone().errors(); track error) {
                  <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
                }
              }
            </label>
          }

          <label class="block">
            <span class="text-sm font-medium text-[#1F2422]">Número de mesa <span class="text-[#B5482A]">*</span></span>
            <input
              type="number"
              class="mt-1.5 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="createForm.table_id"
            />
            @if (createForm.table_id().touched() && createForm.table_id().invalid()) {
              @for (error of createForm.table_id().errors(); track error) {
                <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
              }
            }
          </label>

          <label class="block">
            <span class="text-sm font-medium text-[#1F2422]">Fecha y hora <span class="text-[#B5482A]">*</span></span>
            <input
              type="datetime-local"
              class="mt-1.5 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="createForm.reserved_at"
            />
            @if (previewDateTime()) {
              <p class="mt-1.5 text-xs text-[#2F6F5E]">Se reservará para: {{ previewDateTime() }}</p>
            }
            @if (createForm.reserved_at().touched() && createForm.reserved_at().invalid()) {
              @for (error of createForm.reserved_at().errors(); track error) {
                <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
              }
            }
          </label>

          <label class="block">
            <span class="text-sm font-medium text-[#1F2422]">Número de personas <span class="text-[#B5482A]">*</span></span>
            <input
              type="number"
              class="mt-1.5 w-32 rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
              [formField]="createForm.guest_count"
            />
            @if (createForm.guest_count().touched() && createForm.guest_count().invalid()) {
              @for (error of createForm.guest_count().errors(); track error) {
                <p class="mt-1 text-xs text-[#B5482A]">{{ error.message }}</p>
              }
            }
          </label>

          @if (!isEditMode()) {
            <label class="block">
              <span class="text-sm font-medium text-[#1F2422]">Nota (opcional)</span>
              <textarea
                rows="3"
                class="mt-1.5 w-full rounded-lg border border-[#1F2422]/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6F5E]/30"
                placeholder="Alguna preferencia o detalle a tener en cuenta"
                [formField]="createForm.note"
              ></textarea>
            </label>
          }

          @if (submitError()) {
            <div class="rounded-lg bg-[#B5482A]/5 border border-[#B5482A]/20 px-3 py-2">
              <p class="text-sm text-[#B5482A]">{{ submitError() }}</p>
            </div>
          }

          <div class="flex items-center gap-3 pt-1">
            <button
              type="submit"
              class="rounded-lg bg-[#2F6F5E] px-5 py-2.5 text-white text-sm font-medium hover:bg-[#26594B] transition-colors disabled:opacity-40"
              [disabled]="createForm().invalid()"
            >
              {{ isEditMode() ? 'Guardar cambios' : 'Crear reserva' }}
            </button>
            <a routerLink="/reservas" class="text-sm text-[#1F2422]/60 hover:text-[#1F2422]">Cancelar</a>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class ReservationFormPage implements OnInit {
  private readonly dining = inject(DiningService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isEditMode = signal(false);
  protected readonly submitError = signal<string | null>(null);
  private reservationId: number | null = null;

  protected readonly createModel = signal({
    customer_name: '',
    customer_phone: '',
    table_id: 0,
    reserved_at: '',
    guest_count: 1,
    note: '',
  });

  protected readonly previewDateTime = computed(() => {
    const raw = this.createModel().reserved_at;
    if (!raw || raw.length < 16) return null;
    return formatDateTime(`${raw}:00`);
  });

  protected readonly createForm = form(this.createModel, (path) => {
    required(path.customer_name, { message: 'El nombre del cliente es obligatorio' });
    required(path.customer_phone, { message: 'El telefono es obligatorio' });
    maxLength(path.customer_phone, 20, { message: 'El telefono no puede tener mas de 20 caracteres' });
    required(path.table_id, { message: 'La mesa es obligatoria' });
    min(path.table_id, 1, { message: 'Indique un numero de mesa valido' });
    required(path.reserved_at, { message: 'La fecha y hora son obligatorias' });
    min(path.guest_count, 1, { message: 'Minimo 1 persona' });
  });

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.isEditMode.set(true);
      this.reservationId = Number(idParam);

      const reservation = await this.dining.findReservationById(this.reservationId);
      this.createModel.set({
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone,
        table_id: reservation.restaurant_table_id,
        reserved_at: reservation.reserved_at.slice(0, 16),
        guest_count: reservation.guest_count,
        note: reservation.note ?? '',
      });
    }
  }

  protected onSubmit(event: Event) {
    event.preventDefault();
    this.submitError.set(null);

    submit(this.createForm, {
      action: async () => {
        const model = this.createModel();
        const reservedAtIso = model.reserved_at.length === 16 ? `${model.reserved_at}:00` : model.reserved_at;

        try {
          if (this.isEditMode() && this.reservationId) {
            await this.dining.updateReservation(this.reservationId, {
              table_id: model.table_id,
              reserved_at: reservedAtIso,
              guest_count: model.guest_count,
            });
          } else {
            await this.dining.createReservation({
              customer_name: model.customer_name,
              customer_phone: model.customer_phone,
              table_id: model.table_id,
              reserved_at: reservedAtIso,
              guest_count: model.guest_count,
              note: model.note || null,
            });
          }

          this.router.navigate(['/reservas']);
        } catch (error: any) {
          this.submitError.set(error?.error?.message ?? 'No se pudo guardar la reserva.');
        }
      },
    });
  }
}
