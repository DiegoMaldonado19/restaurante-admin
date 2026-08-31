import { Component, computed, inject, input, signal } from '@angular/core';
import { disabled, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { StaffService } from '../staff.service';
import { ASSIGNABLE_ROLES, ROLE_LABELS, UserRole } from '../staff.types';

interface StaffModel {
  full_name: string;
  username: string;
  password: string;
  role: UserRole;
}

/**
 * Alta y edicion en una sola pantalla: la unica diferencia es que al editar no se pide
 * contrasena (para eso esta "Reponer contrasena" en el listado). Las validaciones
 * espejan las de CreateUserDTO y UpdateUserDTO.
 */
@Component({
  selector: 'app-staff-form',
  imports: [FormField],
  template: `
    <section class="max-w-lg space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">
        {{ isEdit() ? 'Editar empleado' : 'Nuevo empleado' }}
      </h1>

      <form (submit)="onSubmit($event)" class="space-y-4 rounded-xl bg-white p-6 shadow">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Nombre completo</span>
          <input
            type="text"
            [formField]="staffForm.full_name"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          @if (staffForm.full_name().touched() && staffForm.full_name().invalid()) {
            @for (error of staffForm.full_name().errors(); track error.kind) {
              <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
            }
          }
        </label>

        @if (!isEdit()) {
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Usuario</span>
            <input
              type="text"
              autocomplete="off"
              [formField]="staffForm.username"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (staffForm.username().touched() && staffForm.username().invalid()) {
              @for (error of staffForm.username().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Contrasena inicial</span>
            <input
              type="password"
              autocomplete="new-password"
              [formField]="staffForm.password"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            @if (staffForm.password().touched() && staffForm.password().invalid()) {
              @for (error of staffForm.password().errors(); track error.kind) {
                <p class="mt-1 text-sm text-red-600">{{ error.message }}</p>
              }
            }
          </label>
        }

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Rol</span>
          <select
            [formField]="staffForm.role"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            @for (role of roles; track role) {
              <option [value]="role">{{ roleLabels[role] }}</option>
            }
          </select>
        </label>

        @if (failure()) {
          <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ failure() }}
          </p>
        }

        <div class="flex justify-end gap-2">
          <button type="button" (click)="cancel()" class="px-3 py-2 text-sm">Cancelar</button>
          <button
            type="submit"
            [disabled]="staffForm().invalid() || staffForm().submitting()"
            class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </form>
    </section>
  `,
})
export class StaffFormPage {
  /** Viene de la ruta /personal/:id. Ausente al dar de alta. */
  readonly id = input<string>();

  private readonly staffService = inject(StaffService);
  private readonly router = inject(Router);

  protected readonly roles = ASSIGNABLE_ROLES;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly failure = signal<string | null>(null);

  protected readonly model = signal<StaffModel>({
    full_name: '',
    username: '',
    password: '',
    role: 'WAITER',
  });

  protected readonly staffForm = form(this.model, (path) => {
    required(path.full_name, { message: 'El nombre completo es obligatorio' });

    // Al editar, el usuario no cambia y la contrasena se repone desde el listado.
    // Deshabilitados, sus validadores no corren y no hace falta un valor de relleno.
    disabled(path.username, { when: () => this.isEdit() });
    disabled(path.password, { when: () => this.isEdit() });

    required(path.username, { message: 'El usuario es obligatorio' });
    minLength(path.username, 4, { message: 'El usuario tiene al menos 4 caracteres' });

    required(path.password, { message: 'La contrasena es obligatoria' });
    minLength(path.password, 8, { message: 'La contrasena tiene al menos 8 caracteres' });

    required(path.role, { message: 'Elija un rol' });
  });

  constructor() {
    void this.loadWhenEditing();
  }

  protected cancel(): void {
    this.router.navigate(['/personal']);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.failure.set(null);

    submit(this.staffForm, {
      action: async () => {
        const value = this.model();
        const userId = this.id();

        try {
          if (userId !== undefined) {
            await this.staffService.update(Number(userId), {
              full_name: value.full_name,
              role: value.role,
            });
          } else {
            await this.staffService.create(value);
          }

          this.staffService.staff.reload();
          await this.router.navigate(['/personal']);
        } catch (error) {
          // USERNAME_TAKEN llega como 409: el formulario no puede prevenirlo.
          this.failure.set(messageFor(error));
        }

        return undefined;
      },
    });
  }

  private async loadWhenEditing(): Promise<void> {
    const userId = this.id();

    if (userId === undefined) {
      return;
    }

    try {
      const person = await this.staffService.findById(Number(userId));

      this.model.set({
        full_name: person.full_name,
        username: person.username,
        password: '',
        role: person.role,
      });
    } catch (error) {
      this.failure.set(messageFor(error));
    }
  }
}
