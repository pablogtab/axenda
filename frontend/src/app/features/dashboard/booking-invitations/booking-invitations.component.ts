import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingInvitationsService, BookingInvitation } from '../../../core/services/booking-invitations.service';
import { TenantsService } from '../../../core/services/tenants.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { ModalService } from '../../../core/services/modal.service';
import { BookingInvitationFormComponent } from './components/booking-invitation-form/booking-invitation-form.component';
import { DialogService } from '@services/dialog.service';

@Component({
  selector: 'app-booking-invitations',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './booking-invitations.component.html',
  styleUrl: './booking-invitations.component.css'
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
    { value: 7, label: 'Domingo' }
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
      }
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
    navigator.clipboard.writeText(link).then(() => {
      this.copiedToken.set(token);
      this.snackbarService.show('Link copiado al portapapeles', 'success');
      setTimeout(() => {
        if (this.copiedToken() === token) {
          this.copiedToken.set(null);
        }
      }, 3000);
    }).catch(err => {
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
      message: '¿Estás seguro de que deseas eliminar este link de invitación? Los clientes que lo tengan ya no podrán agendar turnos con él.',
      type: 'danger',
      confirmText: 'Eliminar'
    });

    if (!confirmed) {
      return;
    }

    this.invitationsService.delete(id).subscribe({
      next: () => {
        this.invitations.set(this.invitations().filter(inv => inv.id !== id));
        this.snackbarService.show('Invitación eliminada exitosamente', 'success');
      },
      error: (err) => {
        console.error('Error deleting invitation:', err);
        this.snackbarService.show('Error al eliminar la invitación', 'error');
      }
    });
  }

  getDayName(dayNum: number): string {
    const found = this.daysOfWeek.find(d => d.value === dayNum);
    return found ? found.label : 'Día';
  }
}
