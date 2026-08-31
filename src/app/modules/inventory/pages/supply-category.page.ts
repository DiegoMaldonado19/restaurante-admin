import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { messageFor } from '../../../core/error-messages';
import { InventoryService } from '../inventory.service';
import { SupplyCategoryView } from '../inventory.types';

/** Categorias de insumo. El enunciado deja la lista abierta, asi que el administrador la crece. */
@Component({
  selector: 'app-supply-category',
  template: `
    <section class="max-w-2xl space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Categorias de insumo</h1>

      <form (submit)="onCreate($event)" class="flex gap-2 rounded-lg bg-white p-4 shadow">
        <input
          type="text"
          placeholder="Nombre de la categoria"
          maxlength="60"
          required
          [value]="newName()"
          (input)="newName.set($any($event.target).value)"
          class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          [disabled]="newName().trim().length === 0"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      @if (feedback(); as message) {
        <p role="alert" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ message }}</p>
      }

      @if (inventory.categories.isLoading()) {
        <p class="text-slate-500">Cargando categorias...</p>
      } @else {
        <table class="w-full overflow-hidden rounded-lg bg-white text-sm shadow">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3">Categoria</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (category of inventory.categories.value() ?? []; track category.supply_category_id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3">{{ category.name }}</td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [class]="
                      category.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    "
                  >
                    {{ category.active ? 'Activa' : 'Dada de baja' }}
                  </span>
                </td>
                <td class="space-x-3 px-4 py-3">
                  <button type="button" (click)="openRename(category)" class="text-slate-900 underline">
                    Renombrar
                  </button>
                  @if (category.active) {
                    <button type="button" (click)="deactivate(category)" class="text-slate-900 underline">
                      Dar de baja
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="px-4 py-6 text-center text-slate-500">
                  Todavia no hay categorias.
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      <!-- <dialog> nativo: ya existe, ya es accesible y ya funciona con teclado. -->
      <dialog #renameDialog class="rounded-xl p-6 shadow-xl backdrop:bg-slate-900/40">
        <form method="dialog" class="space-y-4" (submit)="confirmRename()">
          <h2 class="text-lg font-semibold">Renombrar categoria</h2>
          <input
            type="text"
            maxlength="60"
            required
            [value]="renameValue()"
            (input)="renameValue.set($any($event.target).value)"
            class="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div class="flex justify-end gap-2">
            <button type="button" (click)="closeRename()" class="px-3 py-2 text-sm">Cancelar</button>
            <button
              type="submit"
              [disabled]="renameValue().trim().length === 0"
              class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </form>
      </dialog>
    </section>
  `,
})
export class SupplyCategoryPage {
  protected readonly inventory = inject(InventoryService);

  protected readonly newName = signal('');
  protected readonly renameValue = signal('');
  protected readonly renameTarget = signal<SupplyCategoryView | null>(null);
  protected readonly feedback = signal<string | null>(null);

  private readonly renameDialog = viewChild.required<ElementRef<HTMLDialogElement>>('renameDialog');

  protected async onCreate(event: Event): Promise<void> {
    event.preventDefault();

    await this.run(async () => {
      await this.inventory.createCategory(this.newName().trim());
      this.newName.set('');
    });
  }

  protected openRename(category: SupplyCategoryView): void {
    this.renameTarget.set(category);
    this.renameValue.set(category.name);
    this.renameDialog().nativeElement.showModal();
  }

  protected closeRename(): void {
    this.renameDialog().nativeElement.close();
  }

  protected async confirmRename(): Promise<void> {
    const target = this.renameTarget();

    if (target === null) {
      return;
    }

    await this.run(() =>
      this.inventory.renameCategory(target.supply_category_id, this.renameValue().trim()),
    );
  }

  /** Baja logica: los insumos que la usan la conservan, solo deja de ofrecerse al crear. */
  protected async deactivate(category: SupplyCategoryView): Promise<void> {
    await this.run(() => this.inventory.deactivateCategory(category.supply_category_id));
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.feedback.set(null);

    try {
      await action();
      this.inventory.categories.reload();
    } catch (error) {
      this.feedback.set(messageFor(error));
    }
  }
}
