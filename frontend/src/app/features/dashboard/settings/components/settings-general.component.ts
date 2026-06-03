import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ImageUploaderComponent } from '@shared/components/image-uploader.component';
import { SelectComponent, SelectConfig } from '@shared/components/select';
import { IconComponent } from '@shared/components/icon.component';
import { DialogService } from '@core/services/dialog.service';

@Component({
  selector: 'app-settings-general',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ImageUploaderComponent,
    SelectComponent,
    IconComponent,
  ],
  template: `
    <div
      class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      [formGroup]="form"
    >
      <div
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4"
      >
        <h2 class="text-xl font-bold text-text-main flex items-center gap-2">
          <app-icon name="store" class="text-primary text-base"></app-icon>
          Información del Negocio
        </h2>

        <!-- Toggle Sitio Activo -->
        <div
          class="flex items-center gap-3 bg-surface-subtle border border-border px-4 py-2 rounded-xl"
        >
          <div class="flex flex-col">
            <span class="font-bold text-xs text-text-main"
              >Sitio de reservas online</span
            >
            <span class="text-[9px] text-text-muted"
              >Permitir reservas de clientes</span
            >
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer scale-90"
          >
            <input
              type="checkbox"
              [checked]="form.get('publicActive')?.value"
              (change)="onToggleActive($event)"
              class="sr-only peer"
            />
            <div
              class="w-10 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
            ></div>
          </label>
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-6 items-start">
        <div class="flex flex-col items-center">
          <app-image-uploader
            label="Logo del Negocio"
            [currentImageUrl]="form.get('logoUrl')?.value"
            [tenantId]="tenantId"
            category="logos"
            shape="square"
            dimensions="w-28 h-28"
            (imageUploaded)="form.get('logoUrl')?.setValue($event)"
          ></app-image-uploader>
          <p class="text-[8px] text-text-muted text-center mt-2 max-w-[120px]">
            PNG, JPG. Máx 2MB.
          </p>
        </div>

        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div class="space-y-1">
            <label
              class="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider block"
              >Nombre del Negocio</label
            >
            <input
              type="text"
              formControlName="name"
              class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="Ej. Mi Peluquería"
            />
          </div>
          <app-select
            [config]="categoryConfig"
            [options]="categories"
            formControlName="category"
          >
          </app-select>
          <div class="space-y-1">
            <label
              class="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider block"
              >Teléfono</label
            >
            <input
              type="tel"
              formControlName="phone"
              class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="+54 11 ..."
            />
          </div>
          <div class="space-y-1">
            <label
              class="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider block"
              >Email de Contacto</label
            >
            <input
              type="email"
              formControlName="email"
              class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="tunegocio@axenda.ar"
            />
          </div>
        </div>
      </div>

      <!-- Public Link Customization -->
      <div class="pt-6 border-t border-border space-y-4">
        <div class="flex items-center justify-between">
          <h3
            class="text-sm font-bold text-text-dim uppercase tracking-widest flex items-center gap-2"
          >
            <app-icon name="link" class="text-primary text-sm"></app-icon> Link
            Público de Reservas
          </h3>
          <span
            *ngIf="
              form.get('publicSlug')?.value &&
              (slugStatus === 'idle' || slugStatus === 'available')
            "
            class="text-[10px] bg-primary-glow text-primary px-2 py-0.5 rounded-full font-bold"
            >Activo</span
          >
        </div>

        <div class="space-y-2">
          <label
            class="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider block"
            >Personalizar Link</label
          >
          <div class="flex items-stretch group relative">
            <div
              class="bg-surface-subtle border border-border border-r-0 rounded-l-xl px-3 md:px-4 flex items-center text-text-muted text-xs md:text-sm whitespace-nowrap transition-colors group-focus-within:border-primary/50 group-focus-within:bg-primary-glow"
            >
              axenda.ar/
            </div>
            <input
              type="text"
              formControlName="publicSlug"
              class="flex-1 bg-surface-subtle border border-border rounded-r-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              placeholder="mi-negocio-increible"
              [class.border-red-500/50]="
                slugStatus === 'taken' || slugStatus === 'invalid'
              "
              [class.border-green-500/50]="slugStatus === 'available'"
            />
            <!-- Status Icons -->
            <div
              class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2"
            >
              <div
                *ngIf="slugStatus === 'checking'"
                class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
              ></div>
              <span
                *ngIf="slugStatus === 'available'"
                class="text-green-500 text-[10px] font-bold flex items-center gap-1 animate-in fade-in zoom-in"
              >
                <app-icon name="check" class="text-xs"></app-icon> Disponible
              </span>
              <span
                *ngIf="slugStatus === 'taken'"
                class="text-red-500 text-[10px] font-bold flex items-center gap-1 animate-in fade-in zoom-in"
              >
                <app-icon name="close" class="text-xs"></app-icon> No disponible
              </span>
              <span
                *ngIf="slugStatus === 'invalid'"
                class="text-red-500 text-[10px] font-bold flex items-center gap-1 animate-in fade-in zoom-in"
              >
                Formato inválido
              </span>
            </div>
          </div>
          <div
            class="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 ml-1 mt-2"
          >
            <p class="text-[10px] text-text-muted italic flex-1">
              Este es el link que compartirás con tus clientes para que reserven
              turnos.
            </p>
            <div class="flex flex-wrap items-center gap-1.5 md:justify-end">
              <button
                *ngIf="
                  form.get('publicSlug')?.value &&
                  (slugStatus === 'idle' || slugStatus === 'available')
                "
                (click)="copyLink.emit()"
                class="text-[10px] text-primary font-black flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-primary-glow hover:scale-105 active:scale-95 whitespace-nowrap border border-transparent hover:border-primary/20"
              >
                <app-icon name="content_copy" class="text-base"></app-icon>
                Copiar link
              </button>
              <button
                *ngIf="
                  form.get('publicSlug')?.value &&
                  (slugStatus === 'idle' || slugStatus === 'available')
                "
                (click)="visitPage.emit()"
                class="text-[10px] text-primary font-black flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-primary-glow hover:scale-105 active:scale-95 whitespace-nowrap border border-transparent hover:border-primary/20"
              >
                <app-icon name="open_in_new" class="text-base"></app-icon> Ver
                mi página
              </button>
              <button
                *ngIf="
                  form.get('publicSlug')?.value &&
                  (slugStatus === 'idle' || slugStatus === 'available')
                "
                (click)="generateQR.emit()"
                class="text-[10px] text-primary font-black flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-primary-glow hover:scale-105 active:scale-95 whitespace-nowrap border border-transparent hover:border-primary/20"
              >
                <app-icon name="qr_code_2" class="text-base"></app-icon> Generar
                QR
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div class="space-y-1">
          <label
            class="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider block"
            >Dirección</label
          >
          <input
            type="text"
            formControlName="address"
            class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder=""
          />
        </div>
      </div>

      <!-- Banner Uploader -->
      <div class="w-full pt-4 border-t border-border">
        <app-image-uploader
          label="Banner del Negocio"
          [currentImageUrl]="form.get('bannerUrl')?.value"
          [tenantId]="tenantId"
          category="banners"
          shape="square"
          dimensions="w-full h-40 md:h-52"
          (imageUploaded)="form.get('bannerUrl')?.setValue($event)"
        ></app-image-uploader>
        <p class="text-[10px] text-text-muted mt-2 italic text-right">
          Recomendado: 1200x400px o similar.
        </p>
      </div>
    </div>
  `,
})
export class SettingsGeneralComponent {
  private dialogService = inject(DialogService);

  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) tenantId!: string;
  @Input({ required: true }) slugStatus!: string;
  @Input({ required: true }) categoryConfig!: SelectConfig;
  @Input({ required: true }) categories!: any[];

  @Output() copyLink = new EventEmitter<void>();
  @Output() visitPage = new EventEmitter<void>();
  @Output() generateQR = new EventEmitter<void>();

  async onToggleActive(event: Event) {
    const input = event.target as HTMLInputElement;
    const checked = input.checked;

    if (!checked) {
      // User is trying to DEACTIVATE the public site. Show confirmation dialog.
      event.preventDefault();
      // Keep checkbox checked until confirmed
      input.checked = true;

      const confirmed = await this.dialogService.confirm({
        title: '¿Desactivar sitio público?',
        message:
          'Tus clientes no podrán ver tu agenda ni reservar turnos online mientras el sitio esté desactivado. ¿Estás seguro?',
        confirmText: 'Sí, desactivar',
        cancelText: 'Cancelar',
        type: 'warning',
      });

      if (confirmed) {
        input.checked = false;
        this.form.get('publicActive')?.setValue(false);
      }
    } else {
      // User is activating the site
      this.form.get('publicActive')?.setValue(true);
    }
  }
}
