import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BookingInvitationsService,
  BookingInvitation,
} from '../../../core/services/booking-invitations.service';
import { TenantsService } from '../../../core/services/tenants.service';
import { IconComponent } from '@shared/components/icon.component';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { ModalService } from '../../../core/services/modal.service';
import { BookingInvitationFormComponent } from './components/booking-invitation-form.component';
import { DialogService } from '@services/dialog.service';

@Component({
  selector: 'app-booking-invitations',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6"
      >
        <div>
          <h1 class="text-3xl font-black tracking-tight text-gradient">
            Links de Invitación
          </h1>
          <p class="text-sm text-text-muted mt-1">
            Reservas privadas con horarios y fechas específicas, incluso con el
            sitio público desactivado.
          </p>
        </div>
        <button
          (click)="openCreateModal()"
          class="btn-primary flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <app-icon name="add" class="text-lg"></app-icon>
          Crear Invitación
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="flex justify-center py-20">
        <div
          class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"
        ></div>
      </div>

      <!-- Empty State -->
      <div
        *ngIf="!loading() && invitations().length === 0"
        class="glass rounded-3xl p-12 text-center max-w-md mx-auto space-y-4"
      >
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary"
        >
          <app-icon name="link" class="text-3xl"></app-icon>
        </div>
        <h3 class="text-xl font-bold text-text-main">No hay links creados</h3>
        <p class="text-sm text-text-muted">
          Crea tu primer link de invitación privada para permitir a ciertos
          clientes agendar turnos en días u horarios específicos.
        </p>
        <button
          (click)="openCreateModal()"
          class="btn-primary w-full flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          <app-icon name="add" class="text-lg"></app-icon>
          Generar Link
        </button>
      </div>

      <!-- Desktop view (Table) -->
      <div
        *ngIf="!loading() && invitations().length > 0"
        class="hidden md:block glass rounded-2xl overflow-hidden"
      >
        <table class="w-full text-sm">
          <thead>
            <tr
              class="border-b border-border text-text-muted text-xs font-semibold uppercase tracking-wider"
            >
              <th class="text-left px-5 py-3.5">Destino</th>
              <th class="text-left px-5 py-3.5">Período</th>
              <th class="text-left px-5 py-3.5">Días / Horario</th>
              <th class="text-left px-5 py-3.5">Usos</th>
              <th class="text-right px-5 py-3.5">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let inv of invitations()"
              class="border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors group"
            >
              <!-- Destino -->
              <td class="px-5 py-3.5">
                <div class="flex flex-col gap-1">
                  <span
                    *ngIf="inv.branch"
                    class="inline-flex items-center gap-1 text-xs text-sky-400"
                  >
                    <app-icon name="store" class="text-[12px]"></app-icon>
                    {{ inv.branch.name }}
                  </span>
                  <span
                    *ngIf="inv.professional"
                    class="inline-flex items-center gap-1 text-xs text-violet-400"
                  >
                    <app-icon name="person" class="text-[12px]"></app-icon>
                    {{ inv.professional.firstName }}
                    {{ inv.professional.lastName }}
                  </span>
                  <span
                    *ngIf="inv.client"
                    class="inline-flex items-center gap-1 text-xs text-emerald-400"
                  >
                    <app-icon name="face" class="text-[12px]"></app-icon>
                    {{ inv.client.firstName }} {{ inv.client.lastName }}
                  </span>
                  <span
                    *ngIf="!inv.branch && !inv.professional && !inv.client"
                    class="text-xs text-text-muted"
                    >—</span
                  >
                </div>
              </td>
              <!-- Período -->
              <td class="px-5 py-3.5 text-xs text-text-main whitespace-nowrap">
                <span *ngIf="inv.startDate || inv.endDate">
                  {{ inv.startDate ? (inv.startDate | date: 'dd/MM/yy') : '∞' }}
                  →
                  {{ inv.endDate ? (inv.endDate | date: 'dd/MM/yy') : '∞' }}
                </span>
                <span
                  *ngIf="!inv.startDate && !inv.endDate"
                  class="text-text-muted"
                  >Sin límite</span
                >
              </td>
              <!-- Días / Horario -->
              <td class="px-5 py-3.5">
                <div class="flex flex-wrap gap-1">
                  <span
                    *ngFor="let s of inv.schedule"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-primary/10 text-primary-text border border-primary/10"
                  >
                    {{ getDayName(s.dayOfWeek).slice(0, 3) }}
                    {{ s.startTime }}–{{ s.endTime }}
                  </span>
                </div>
              </td>
              <!-- Usos -->
              <td class="px-5 py-3.5 text-xs text-text-main whitespace-nowrap">
                {{ inv.usesCount }}{{ inv.maxUses ? ' / ' + inv.maxUses : '' }}
              </td>
              <!-- Acciones -->
              <td class="px-5 py-3.5">
                <div
                  class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <!-- Copiar link -->
                  <button
                    (click)="copyLink(inv.token)"
                    class="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                    title="Copiar link"
                  >
                    <app-icon
                      [name]="
                        copiedToken() === inv.token ? 'check' : 'content_copy'
                      "
                      [class.text-emerald-400]="copiedToken() === inv.token"
                      class="text-[16px]"
                    >
                    </app-icon>
                  </button>
                  <!-- Compartir por WhatsApp -->
                  <button
                    (click)="shareOnWhatsapp(inv.token, inv.client?.phone)"
                    class="p-1.5 rounded-lg hover:bg-[#25d366]/10 hover:text-[#25d366] text-text-muted transition-all cursor-pointer"
                    title="Compartir por WhatsApp"
                  >
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                      />
                    </svg>
                  </button>
                  <!-- Eliminar -->
                  <button
                    (click)="deleteInvitation(inv.id)"
                    class="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-text-muted transition-all cursor-pointer"
                    title="Eliminar"
                  >
                    <app-icon name="delete" class="text-[16px]"></app-icon>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile view (Card list) -->
      <div
        *ngIf="!loading() && invitations().length > 0"
        class="md:hidden space-y-3"
      >
        <div
          *ngFor="let inv of invitations()"
          class="glass rounded-2xl p-4 border border-border/40 hover:border-primary/20 transition-all flex flex-col gap-2.5"
        >
          <!-- Top Row: Target + Actions -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center min-w-0">
              <!-- Destino -->
              <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  *ngIf="inv.branch"
                  class="inline-flex items-center gap-1 text-xs text-sky-400 font-bold truncate"
                >
                  <app-icon name="store" class="text-[12px]"></app-icon>
                  {{ inv.branch.name }}
                </span>
                <span
                  *ngIf="inv.professional"
                  class="inline-flex items-center gap-1 text-xs text-violet-400 font-bold truncate"
                >
                  <app-icon name="person" class="text-[12px]"></app-icon>
                  {{ inv.professional.firstName }}
                  {{ inv.professional.lastName }}
                </span>
                <span
                  *ngIf="inv.client"
                  class="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold truncate"
                >
                  <app-icon name="face" class="text-[12px]"></app-icon>
                  {{ inv.client.firstName }} {{ inv.client.lastName }}
                </span>
                <span
                  *ngIf="!inv.branch && !inv.professional && !inv.client"
                  class="text-xs text-text-muted"
                  >—</span
                >
              </div>
            </div>

            <!-- Compact Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                (click)="copyLink(inv.token)"
                class="w-7 h-7 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer flex items-center justify-center"
                title="Copiar link"
              >
                <app-icon
                  [name]="
                    copiedToken() === inv.token ? 'check' : 'content_copy'
                  "
                  [class.text-emerald-400]="copiedToken() === inv.token"
                  class="text-[12px]"
                >
                </app-icon>
              </button>
              <button
                (click)="shareOnWhatsapp(inv.token, inv.client?.phone)"
                class="w-7 h-7 rounded-lg bg-[#25d366]/5 hover:bg-[#25d366]/10 hover:text-[#25d366] text-text-muted transition-all cursor-pointer flex items-center justify-center"
                title="Compartir por WhatsApp"
              >
                <svg
                  class="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                  />
                </svg>
              </button>
              <button
                (click)="deleteInvitation(inv.id)"
                class="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-text-muted transition-all cursor-pointer flex items-center justify-center"
                title="Eliminar"
              >
                <app-icon name="delete" class="text-[12px]"></app-icon>
              </button>
            </div>
          </div>

          <!-- Bottom Row: Uses count, Validity, and Schedule chips -->
          <div
            class="flex flex-col gap-2 border-t border-border/10 pt-2 text-[10px] text-text-muted"
          >
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-text-main">
                {{ inv.usesCount
                }}{{ inv.maxUses ? ' / ' + inv.maxUses + ' usos' : ' usos' }}
              </span>
              <span>•</span>
              <span class="flex items-center gap-1 font-medium">
                <app-icon
                  name="calendar_today"
                  class="text-[10px] text-text-muted"
                ></app-icon>
                {{
                  inv.startDate ? (inv.startDate | date: 'dd/MM/yy') : 'Siempre'
                }}
                <span class="text-text-dim font-normal">hasta</span>
                {{ inv.endDate ? (inv.endDate | date: 'dd/MM/yy') : 'Siempre' }}
              </span>
            </div>

            <!-- Schedule Chips (if present) -->
            <div
              class="flex flex-wrap gap-1 mt-0.5"
              *ngIf="inv.schedule && inv.schedule.length > 0"
            >
              <span
                *ngFor="let s of inv.schedule"
                class="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/5 text-primary text-[9px] font-semibold border border-primary/10"
              >
                {{ getDayName(s.dayOfWeek).slice(0, 3) }} {{ s.startTime }}–{{
                  s.endTime
                }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .invitation-select {
      background: transparent;
      border: none;
      font-size: 0.875rem;
      color: var(--color-text-main);
      font-weight: 600;
      cursor: pointer;
      outline: none;
      width: 100%;
    }
  `,
})
export class BookingInvitationsComponent implements OnInit {
  private invitationsService = inject(BookingInvitationsService);
  private tenantsService = inject(TenantsService);
  private snackbarService = inject(SnackbarService);
  private modal = inject(ModalService);
  private dialog = inject(DialogService);

  invitations = signal<BookingInvitation[]>([]);
  loading = signal(true);

  daysOfWeek = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' },
  ];

  copiedToken = signal<string | null>(null);

  tenantPublicSlug = computed(() => {
    return this.tenantsService.currentTenant()?.publicSlug || '';
  });

  ngOnInit() {
    this.loadInvitations();
  }

  loadInvitations() {
    this.loading.set(true);
    this.invitationsService.findAll().subscribe({
      next: (data) => {
        this.invitations.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading invitations:', err);
        this.snackbarService.show('Error al cargar las invitaciones', 'error');
        this.loading.set(false);
      },
    });
  }

  openCreateModal() {
    const ref = this.modal.open(BookingInvitationFormComponent);
    ref.closed.subscribe((result) => {
      if (result) {
        this.loadInvitations();
      }
    });
  }

  getInvitationLink(token: string): string {
    const base = window.location.origin;
    return `${base}/${this.tenantPublicSlug()}?invitation=${token}`;
  }

  copyLink(token: string) {
    const link = this.getInvitationLink(token);
    navigator.clipboard
      .writeText(link)
      .then(() => {
        this.copiedToken.set(token);
        this.snackbarService.show('Link copiado al portapapeles', 'success');
        setTimeout(() => {
          if (this.copiedToken() === token) {
            this.copiedToken.set(null);
          }
        }, 3000);
      })
      .catch((err) => {
        console.error('Could not copy link', err);
        this.snackbarService.show('Error al copiar el link', 'error');
      });
  }

  shareOnWhatsapp(token: string, phone?: string) {
    const link = this.getInvitationLink(token);
    const message = `¡Hola! Te comparto este link para que puedas agendar tu turno online 👇\n${link}`;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async deleteInvitation(id: string) {
    const confirmed = await this.dialog.confirm({
      title: '¿Eliminar link de invitación?',
      message:
        '¿Estás seguro de que deseas eliminar este link de invitación? Los clientes que lo tengan ya no podrán agendar turnos con él.',
      type: 'danger',
      confirmText: 'Eliminar',
    });

    if (!confirmed) {
      return;
    }

    this.invitationsService.delete(id).subscribe({
      next: () => {
        this.invitations.set(this.invitations().filter((inv) => inv.id !== id));
        this.snackbarService.show(
          'Invitación eliminada exitosamente',
          'success',
        );
      },
      error: (err) => {
        console.error('Error deleting invitation:', err);
        this.snackbarService.show('Error al eliminar la invitación', 'error');
      },
    });
  }

  getDayName(dayNum: number): string {
    const found = this.daysOfWeek.find((d) => d.value === dayNum);
    return found ? found.label : 'Día';
  }
}
