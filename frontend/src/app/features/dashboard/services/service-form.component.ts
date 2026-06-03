import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import {
  BusinessService,
  ServicesService,
  ServiceCategory,
} from '@services/services.service';
import { SnackbarService } from '@services/snackbar.service';
import { TenantsService } from '@services/tenants.service';
import { DialogService } from '@services/dialog.service';
import { ImageUploaderComponent } from '@shared/components/image-uploader.component';
import { IconComponent } from '@shared/components/icon.component';
import { StoragePipe } from '@shared/pipes/storage.pipe';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    ImageUploaderComponent,
    IconComponent,
    StoragePipe,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Back Button & Header -->
      <div class="flex items-center gap-4">
        <button
          type="button"
          (click)="onCancel()"
          class="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-subtle hover:bg-surface-subtle-hover text-text-main transition-all border border-border"
        >
          <app-icon name="arrow_back"></app-icon>
        </button>
        <div>
          <h2 class="text-2xl font-bold text-text-main tracking-tight">
            {{ isEditing() ? 'Editar Servicio' : 'Nuevo Servicio' }}
          </h2>
          <p class="text-text-muted text-sm mt-1">
            Completa los detalles y la configuración del servicio.
          </p>
        </div>
      </div>

      <div class="max-w-3xl">
        <form
          [formGroup]="serviceForm"
          (ngSubmit)="onSubmit()"
          class="flex flex-col gap-6 bg-surface-subtle/30 p-6 md:p-8 rounded-2xl border border-border"
        >
          <!-- Name -->
          <div class="flex flex-col gap-2">
            <label for="name" class="text-sm font-semibold text-text-muted"
              >Nombre del Servicio *</label
            >
            <input
              id="name"
              type="text"
              formControlName="name"
              class="input-field"
              placeholder="Ej: Corte de Cabello"
            />
            @if (
              serviceForm.get('name')?.touched &&
              serviceForm.get('name')?.invalid
            ) {
              <span class="text-xs text-red-400">El nombre es obligatorio</span>
            }
          </div>

          <!-- Duration & Price -->
          <div class="grid grid-cols-2 gap-6">
            <div class="flex flex-col gap-2">
              <label
                for="duration"
                class="text-sm font-semibold text-text-muted"
                >Duración (minutos) *</label
              >
              <input
                id="duration"
                type="number"
                formControlName="duration"
                class="input-field"
                step="5"
              />
              @if (
                serviceForm.get('duration')?.touched &&
                serviceForm.get('duration')?.invalid
              ) {
                <span class="text-xs text-red-400">Mínimo 5 min</span>
              }
            </div>
            <div class="flex flex-col gap-2">
              <label for="price" class="text-sm font-semibold text-text-muted"
                >Precio ($) *</label
              >
              <input
                id="price"
                type="number"
                formControlName="price"
                class="input-field"
              />
            </div>
          </div>

          <!-- Category & Color -->
          <div class="grid grid-cols-2 gap-6">
            <div class="flex flex-col gap-2">
              <label
                for="categoryId"
                class="text-sm font-semibold text-text-muted"
                >Categoría</label
              >
              <select
                id="categoryId"
                formControlName="categoryId"
                class="input-field"
              >
                <option value="">Sin categoría</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label for="color" class="text-sm font-semibold text-text-muted"
                >Color en Agenda</label
              >
              <div
                class="flex items-center gap-4 bg-bg-secondary p-2 rounded-xl border border-border"
              >
                <input
                  id="color"
                  type="color"
                  formControlName="color"
                  class="w-10 h-10 bg-transparent border-none cursor-pointer"
                />
                <span class="font-mono text-sm font-bold text-text-muted">{{
                  serviceForm.get('color')?.value
                }}</span>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="flex flex-col gap-2">
            <label
              for="description"
              class="text-sm font-semibold text-text-muted"
              >Descripción</label
            >
            <textarea
              id="description"
              formControlName="description"
              rows="2"
              class="input-field resize-none"
              placeholder="Breve descripción del servicio..."
            ></textarea>
          </div>

          <!-- Indications -->
          <div class="flex flex-col gap-2">
            <label
              for="indications"
              class="text-sm font-semibold text-text-muted"
              >Preparación / Indicaciones Especiales</label
            >
            <textarea
              id="indications"
              formControlName="indications"
              rows="2"
              class="input-field resize-none"
              placeholder="Ej: Venir con el cabello limpio, no apto para embarazadas..."
            ></textarea>
            <span class="text-[11px] text-text-dim"
              >Instrucciones previas y advertencias que verá el cliente en la
              reserva.</span
            >
          </div>

          <!-- ¿Qué incluye? (Oculto por ahora) -->
          @if (false) {
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-text-muted"
                >¿Qué incluye el servicio?</label
              >
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="currentIncludeInput"
                  [ngModelOptions]="{ standalone: true }"
                  class="input-field flex-1"
                  placeholder="Ej: Lavado premium, Masaje capilar..."
                  (keydown.enter)="addInclude($event)"
                />
                <button
                  type="button"
                  class="btn-primary !px-4 !py-2 shrink-0 flex items-center justify-center"
                  (click)="addInclude($event)"
                >
                  <app-icon name="add" class="text-base"></app-icon>
                </button>
              </div>
              <span class="text-[11px] text-text-dim"
                >Presiona "+" o Enter para añadir elementos.</span
              >

              @if (includesList().length > 0) {
                <div
                  class="flex flex-wrap gap-2 mt-2 bg-surface-subtle/50 p-3 rounded-2xl border border-border"
                >
                  @for (item of includesList(); track $index) {
                    <span
                      class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-text-main border border-primary/20 flex items-center gap-2"
                    >
                      {{ item }}
                      <button
                        type="button"
                        class="text-text-dim hover:text-red-400 font-bold transition-colors leading-none"
                        (click)="removeInclude($index)"
                      >
                        ×
                      </button>
                    </span>
                  }
                </div>
              }
            </div>
          }

          <!-- Galería de Imágenes -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-text-muted"
                >Galería de Imágenes</label
              >
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full"
                [class.text-text-dim]="galleryList().length < 5"
                [class.bg-surface-subtle]="galleryList().length < 5"
                [class.text-amber-400]="galleryList().length === 5"
                [class.bg-amber-500/10]="galleryList().length === 5"
                >{{ galleryList().length }}/5</span
              >
            </div>

            <!-- Image Uploader (oculto al llegar al límite) -->
            @if (galleryList().length < 5) {
              <app-image-uploader
                [tenantId]="tenantId()"
                category="services"
                label=""
                [resetAfterUpload]="true"
                (imageUploaded)="onImageUploaded($event)"
              >
              </app-image-uploader>
              <span class="text-[11px] text-text-dim mt-[-4px]"
                >Sube hasta 5 fotos de muestra. Podrás fijar una como
                portada.</span
              >
            } @else {
              <div
                class="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  />
                </svg>
                Límite de 5 fotos alcanzado. Eliminá alguna para agregar más.
              </div>
            }

            <!-- Thumbnails Grid -->
            @if (galleryList().length > 0) {
              <div
                class="grid grid-cols-3 gap-4 mt-2 bg-surface-subtle/50 p-4 rounded-2xl border border-border"
              >
                @if (galleryList().length > 1) {
                  <p
                    class="col-span-3 text-[10px] text-text-dim flex items-center gap-1 -mb-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                      />
                    </svg>
                    Arrastrá para reordenar
                  </p>
                }
                @for (imgKey of galleryList(); track imgKey; let i = $index) {
                  <div
                    class="relative rounded-2xl overflow-hidden border-2 group/img aspect-square bg-bg-secondary flex items-center justify-center transition-all duration-200 cursor-grab active:cursor-grabbing"
                    [class.opacity-30]="dragIndex() === i"
                    [class.border-primary]="
                      dragOverIndex() === i && dragIndex() !== i
                    "
                    [class.scale-105]="
                      dragOverIndex() === i && dragIndex() !== i
                    "
                    [class.border-border]="
                      dragOverIndex() !== i || dragIndex() === i
                    "
                    draggable="true"
                    (dragstart)="onDragStart(i)"
                    (dragenter)="$event.preventDefault(); onDragEnter(i)"
                    (dragover)="$event.preventDefault()"
                    (dragend)="onDragEnd()"
                  >
                    <img
                      [src]="imgKey | storage"
                      class="w-full h-full object-cover pointer-events-none"
                    />

                    <!-- Overlay with Actions -->
                    <div
                      class="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col justify-between p-2"
                    >
                      <div class="flex justify-end gap-1">
                        <!-- Delete Button -->
                        <button
                          type="button"
                          (click)="removeImage(imgKey)"
                          class="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all"
                          title="Eliminar foto"
                        >
                          <app-icon name="delete" class="text-sm"></app-icon>
                        </button>
                      </div>

                      <div class="flex justify-center">
                        <!-- Make Cover Photo Button -->
                        @if (
                          serviceForm.get('mainImageKey')?.value === imgKey
                        ) {
                          <span
                            class="px-2 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-bold flex items-center gap-1"
                          >
                            <app-icon
                              name="star"
                              class="text-[10px] symbol-fill"
                            ></app-icon>
                            Portada
                          </span>
                        } @else {
                          <button
                            type="button"
                            (click)="setMainImage(imgKey)"
                            class="px-2 py-1 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black text-[10px] font-bold flex items-center gap-1 transition-all"
                          >
                            Usar como Portada
                          </button>
                        }
                      </div>
                    </div>

                    <!-- Small cover icon visible always when not hovered -->
                    @if (serviceForm.get('mainImageKey')?.value === imgKey) {
                      <div
                        class="absolute top-2 left-2 w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg border border-black/10 group-hover/img:hidden"
                      >
                        <app-icon
                          name="star"
                          class="text-[12px] symbol-fill"
                        ></app-icon>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Active Toggle (Hidden: services are always active unless physically deleted/hidden) -->
          @if (false) {
            <div class="flex items-center gap-3 py-2">
              <input
                id="active"
                type="checkbox"
                formControlName="active"
                class="w-5 h-5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20"
              />
              <label
                for="active"
                class="text-sm font-medium text-text-muted cursor-pointer"
                >Servicio activo</label
              >
            </div>
          }

          <!-- Sección: Configuración de Vista Pública -->
          <div class="border-t border-border pt-6 flex flex-col gap-4">
            <h3
              class="text-xs font-bold text-text-dim uppercase tracking-wider"
            >
              Vista Pública
            </h3>

            <div class="flex items-start gap-3">
              <label
                class="relative inline-flex items-center cursor-pointer mt-0.5"
              >
                <input
                  type="checkbox"
                  formControlName="isBookablePublic"
                  class="sr-only peer"
                />
                <div
                  class="w-9 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
                ></div>
              </label>
              <div
                class="flex flex-col gap-0.5 select-none cursor-pointer"
                (click)="
                  serviceForm
                    .get('isBookablePublic')
                    ?.setValue(!serviceForm.get('isBookablePublic')?.value)
                "
              >
                <span class="text-sm font-semibold text-text-main"
                  >Disponible para reservas online</span
                >
                <span class="text-xs text-text-dim"
                  >Permite a los clientes reservar este servicio desde la página
                  pública.</span
                >
              </div>
            </div>

            @if (serviceForm.get('isBookablePublic')?.value) {
              <div
                class="pl-6 flex flex-col gap-4 border-l-2 border-primary/20 ml-3.5 transition-all duration-300"
              >
                <div class="flex items-start gap-3">
                  <label
                    class="relative inline-flex items-center cursor-pointer mt-0.5"
                  >
                    <input
                      type="checkbox"
                      formControlName="showPrice"
                      class="sr-only peer"
                    />
                    <div
                      class="w-9 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
                    ></div>
                  </label>
                  <div
                    class="flex flex-col gap-0.5 select-none cursor-pointer"
                    (click)="
                      serviceForm
                        .get('showPrice')
                        ?.setValue(!serviceForm.get('showPrice')?.value)
                    "
                  >
                    <span class="text-sm font-semibold text-text-main"
                      >Mostrar precio</span
                    >
                    <span class="text-xs text-text-dim"
                      >Muestra el precio del servicio en la página de
                      reservas.</span
                    >
                  </div>
                </div>

                @if (!serviceForm.get('showPrice')?.value) {
                  <div
                    class="flex flex-col gap-2 max-w-md ml-1 animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    <label
                      for="customPriceLabel"
                      class="text-xs font-semibold text-text-muted"
                      >Texto alternativo para el precio (opcional)</label
                    >
                    <input
                      id="customPriceLabel"
                      type="text"
                      formControlName="customPriceLabel"
                      class="input-field py-2 text-sm"
                      placeholder="Ej: Consultar precio, A convenir"
                    />
                    <span class="text-[11px] text-text-dim leading-normal"
                      >Si se deja vacío, no se mostrará ninguna referencia de
                      precio en el portal público.</span
                    >
                  </div>
                }

                <div class="flex items-start gap-3">
                  <label
                    class="relative inline-flex items-center cursor-pointer mt-0.5"
                  >
                    <input
                      type="checkbox"
                      formControlName="showDuration"
                      class="sr-only peer"
                    />
                    <div
                      class="w-9 h-5 bg-text-main/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
                    ></div>
                  </label>
                  <div
                    class="flex flex-col gap-0.5 select-none cursor-pointer"
                    (click)="
                      serviceForm
                        .get('showDuration')
                        ?.setValue(!serviceForm.get('showDuration')?.value)
                    "
                  >
                    <span class="text-sm font-semibold text-text-main"
                      >Mostrar duración</span
                    >
                    <span class="text-xs text-text-dim"
                      >Muestra la duración del servicio en la página de
                      reservas.</span
                    >
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-4 pt-6 border-t border-border mt-4">
            <button
              type="button"
              class="btn-secondary min-w-[120px]"
              (click)="onCancel()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-primary min-w-[150px]"
              [disabled]="isSubmitting"
            >
              {{
                isSubmitting
                  ? 'Guardando...'
                  : isEditing()
                    ? 'Actualizar'
                    : 'Crear Servicio'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      /* Refactored to Tailwind CSS */
    `,
  ],
})
export class ServiceFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private servicesService = inject(ServicesService);
  private snackbar = inject(SnackbarService);
  private tenantsService = inject(TenantsService);
  private dialog = inject(DialogService);

  @Input() service: BusinessService | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  categories = signal<ServiceCategory[]>([]);
  isEditing = signal(false);
  isSubmitting = false;

  tenantId = computed(() => this.tenantsService.currentTenant()?.id || '');

  // Listas reactivas
  includesList = signal<string[]>([]);
  galleryList = signal<string[]>([]);
  currentIncludeInput = '';

  // Drag & drop reordering
  dragIndex = signal<number>(-1);
  dragOverIndex = signal<number>(-1);

  onDragStart(index: number): void {
    this.dragIndex.set(index);
  }

  onDragEnter(index: number): void {
    this.dragOverIndex.set(index);
  }

  onDragEnd(): void {
    const from = this.dragIndex();
    const to = this.dragOverIndex();
    if (from !== -1 && to !== -1 && from !== to) {
      const list = [...this.galleryList()];
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      this.galleryList.set(list);
      // Si la portada cambió de índice la mantenemos igual (por key, no índice)
      this.serviceForm.markAsDirty();
    }
    this.dragIndex.set(-1);
    this.dragOverIndex.set(-1);
  }

  serviceForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    duration: [30, [Validators.required, Validators.min(5)]],
    price: [0, [Validators.required, Validators.min(0)]],
    color: ['#6366f1', [Validators.required]],
    categoryId: [''],
    active: [true],
    isBookablePublic: [true],
    showPrice: [true],
    customPriceLabel: [''],
    showDuration: [true],
    indications: [''],
    includes: [[]],
    mainImageKey: [''],
    galleryKeys: [[]],
  });

  ngOnInit(): void {
    this.loadCategories();

    if (this.service) {
      this.isEditing.set(true);
      this.serviceForm.patchValue({
        name: this.service.name,
        description: this.service.description || '',
        duration: this.service.duration,
        price: this.service.price,
        color: this.service.color || '#6366f1',
        categoryId: this.service.categoryId || '',
        active: this.service.active,
        isBookablePublic: this.service.isBookablePublic ?? true,
        showPrice: this.service.showPrice ?? true,
        customPriceLabel: this.service.customPriceLabel || '',
        showDuration: this.service.showDuration ?? true,
        indications: this.service.indications || '',
        includes: this.service.includes || [],
        mainImageKey: this.service.mainImageKey || '',
        galleryKeys: this.service.galleryKeys || [],
      });
      this.includesList.set(this.service.includes || []);
      this.galleryList.set(this.service.galleryKeys || []);
    } else {
      this.isEditing.set(false);
      this.includesList.set([]);
      this.galleryList.set([]);
    }
  }

  loadCategories(): void {
    this.servicesService.findAllCategories().subscribe({
      next: (data) => this.categories.set(data),
      error: () => this.snackbar.error('No se pudieron cargar las categorías'),
    });
  }

  addInclude(event: Event): void {
    event.preventDefault();
    const val = this.currentIncludeInput.trim();
    if (val && !this.includesList().includes(val)) {
      this.includesList.update((list) => [...list, val]);
      this.currentIncludeInput = '';
    }
  }

  removeInclude(index: number): void {
    this.includesList.update((list) => list.filter((_, i) => i !== index));
  }

  onImageUploaded(key: string): void {
    if (!key) return;
    if (this.galleryList().includes(key)) return;
    if (this.galleryList().length >= 5) return; // límite máximo
    this.galleryList.update((list) => [...list, key]);
    // Auto-set cover image if none is currently selected
    if (!this.serviceForm.get('mainImageKey')?.value) {
      this.serviceForm.get('mainImageKey')?.setValue(key);
    }
    this.serviceForm.markAsDirty();
  }

  setMainImage(key: string): void {
    this.serviceForm.get('mainImageKey')?.setValue(key);
    this.serviceForm.markAsDirty();
  }

  removeImage(key: string): void {
    this.galleryList.update((list) => list.filter((k) => k !== key));

    // If the removed image was the cover photo, select another one or clear
    if (this.serviceForm.get('mainImageKey')?.value === key) {
      const remaining = this.galleryList();
      this.serviceForm
        .get('mainImageKey')
        ?.setValue(remaining.length > 0 ? remaining[0] : '');
    }
    this.serviceForm.markAsDirty();
  }

  onSubmit(): void {
    // Sincronizar señales con los controles del formulario
    this.serviceForm.get('includes')?.setValue(this.includesList());
    this.serviceForm.get('galleryKeys')?.setValue(this.galleryList());

    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload = { ...this.serviceForm.value };

    // Convert empty string categoryId to null to pass UUID validation
    if (payload.categoryId === '') {
      payload.categoryId = null;
    }

    const request$ =
      this.isEditing() && this.service
        ? this.servicesService.update(this.service.id, payload)
        : this.servicesService.create(payload);

    request$.subscribe({
      next: () => {
        this.snackbar.success(
          this.isEditing() ? 'Servicio actualizado' : 'Servicio creado',
        );
        this.save.emit();
      },
      error: () => {
        this.isSubmitting = false;
        this.snackbar.error('Error al guardar el servicio');
      },
    });
  }

  async onCancel(): Promise<void> {
    if (this.serviceForm.dirty) {
      const confirmed = await this.dialog.confirm({
        title: '¿Descartar cambios?',
        message:
          'Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?',
        type: 'warning',
        confirmText: 'Descartar',
        cancelText: 'Seguir editando',
      });
      if (!confirmed) return;
    }
    this.cancel.emit();
  }
}
