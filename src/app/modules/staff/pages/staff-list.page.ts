import { Component, inject, signal, viewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../../core/error-messages';
import { formatDate } from '../../../core/format';
import { StaffService } from '../staff.service';
import { ASSIGNABLE_ROLES, ROLE_LABELS, UserStatus, UserView } from '../staff.types';

@Component({
  selector: 'app-staff-list',
  imports: [RouterLink],
  template: `
    <section class="space-y-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-slate-900">Personal</h1>
        <a
          routerLink="/personal/nuevo"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Nuevo empleado
        </a>
      </header>

      <div class="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow">
        <input
          type="search"
          placeholder="Nombre o usuario"
          [value]="staffService.search()"
          (input)="staffService.search.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          [value]="staffService.roleFilter()"
          (change)="staffService.roleFilter.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los roles</option>
          @for (role of roles; track role) {
            <option [value]="role">{{ roleLabels[role] }}</option>
          }
        </select>
        <select
          [value]="staffService.statusFilter()"
          (change)="staffService.statusFilter.set($any($event.target).value)"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
      </div>

      @if (feedback(); as message) {
        <p role="alert" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {{ message }}
        </p>
      }

      @if (staffService.staff.isLoading()) {
        <p class="text-slate-500">Cargando empleados...</p>
      } @else if (staffService.staff.error()) {
        <p class="text-red-600">{{ errorMessage() }}</p>
      } @else {
        <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Usuario</th>
              <th class="px-4 py-3">Rol</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Alta</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (person of staffService.staff.value()?.content ?? []; track person.user_id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3">{{ person.full_name }}</td>
                <td class="px-4 py-3 text-slate-500">{{ person.username }}</td>
                <td class="px-4 py-3">{{ roleLabels[person.role] }}</td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [class]="
                      person.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    "
                  >
                    {{ person.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-500">{{ asDate(person.created_at) }}</td>
                <td class="space-x-3 px-4 py-3">
                  <a [routerLink]="['/personal', person.user_id]" class="text-slate-900 underline">
                    Editar
                  </a>
                  <button type="button" (click)="toggleStatus(person)" class="text-slate-900 underline">
                    {{ person.status === 'ACTIVE' ? 'Desactivar' : 'Activar' }}
                  </button>
                  <button type="button" (click)="openReset(person)" class="text-slate-900 underline">
                    Reponer contrasena
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="px-4 py-6 text-center text-slate-500">
                  No hay empleados que coincidan con el filtro.
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      <!-- <dialog> nativo: ya existe, ya es accesible y ya funciona con teclado. -->
      <dialog #resetDialog class="rounded-xl p-6 shadow-xl backdrop:bg-slate-900/40">
        <form method="dialog" class="space-y-4" (submit)="confirmReset()">
          <h2 class="text-lg font-semibold">Reponer contrasena</h2>
          <p class="text-sm text-slate-600">
            Se asignara una contrasena nueva a <strong>{{ resetTarget()?.full_name }}</strong
            >.
          </p>
          <input
            type="password"
            placeholder="Contrasena nueva"
            minlength="8"
            required
            [value]="newPassword()"
            (input)="newPassword.set($any($event.target).value)"
            class="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div class="flex justify-end gap-2">
            <button type="button" (click)="closeReset()" class="px-3 py-2 text-sm">Cancelar</button>
            <button
              type="submit"
              class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              [disabled]="newPassword().length < 8"
            >
              Reponer
            </button>
          </div>
        </form>
      </dialog>
    </section>
  `,
})
export class StaffListPage {
  protected readonly staffService = inject(StaffService);

  protected readonly roles = ASSIGNABLE_ROLES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly asDate = formatDate;

  protected readonly feedback = signal<string | null>(null);
  protected readonly resetTarget = signal<UserView | null>(null);
  protected readonly newPassword = signal('');

  private readonly resetDialog = viewChild.required<ElementRef<HTMLDialogElement>>('resetDialog');

  protected errorMessage(): string {
    return messageFor(this.staffService.staff.error());
  }

  protected async toggleStatus(person: UserView): Promise<void> {
    const next: UserStatus = person.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    await this.run(() => this.staffService.changeStatus(person.user_id, next));
  }

  protected openReset(person: UserView): void {
    this.resetTarget.set(person);
    this.newPassword.set('');
    this.resetDialog().nativeElement.showModal();
  }

  protected closeReset(): void {
    this.resetDialog().nativeElement.close();
  }

  protected async confirmReset(): Promise<void> {
    const target = this.resetTarget();

    if (target === null) {
      return;
    }

    await this.run(async () => {
      await this.staffService.resetPassword(target.user_id, this.newPassword());
      this.feedback.set(`Contrasena repuesta para ${target.full_name}.`);
    });

    this.newPassword.set('');
  }

  /** Todo 409 se maneja aunque el formulario este validado: el estado pudo cambiar. */
  private async run(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
      this.staffService.staff.reload();
    } catch (error) {
      this.feedback.set(messageFor(error));
    }
  }
}
