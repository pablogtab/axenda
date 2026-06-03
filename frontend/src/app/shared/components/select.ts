import {
  Component,
  Input,
  forwardRef,
  signal,
  ViewChild,
  ElementRef,
  inject,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { OverlayModule } from '@angular/cdk/overlay';
import { DialogRef } from '@angular/cdk/dialog';

export interface SelectConfig<T = any> {
  label?: string;
  placeholder?: string;
  displayFn: (item: T) => string;
  descriptionFn?: (item: T) => string;
  valueFn?: (item: T) => any;
  colorFn?: (item: T) => string;
  iconFn?: (item: T) => string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OverlayModule],
  template: `
    <div class="space-y-2">
      @if (label) {
        <label
          class="text-xs font-bold text-text-dim uppercase tracking-wider block"
        >
          {{ label }}
        </label>
      }

      <div class="relative">
        <!-- Input de Búsqueda / Trigger -->
        <input
          #searchInput
          cdkOverlayOrigin
          #trigger="cdkOverlayOrigin"
          type="text"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          [formControl]="searchControl"
          [placeholder]="
            isFilterable() ? 'Escribir para buscar...' : placeholder
          "
          [tabIndex]="skipFocus() ? -1 : 0"
          [readOnly]="!isFilterable()"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keydown)="handleKeyDown($event)"
          [hidden]="selectedItem()"
          [class.cursor-pointer]="!isFilterable()"
          [class.cursor-text]="isFilterable()"
          class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
        />

        <!-- Icono de Flecha (cuando no hay selección) -->
        @if (!selectedItem() && !isOpen()) {
          <div
            class="absolute right-4 top-3.5 pointer-events-none text-text-dim"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        }

        <!-- Item Seleccionado -->
        @if (selectedItem()) {
          <div
            class="flex items-center justify-between bg-primary-glow border border-primary/20 rounded-xl px-4 py-2 animate-in fade-in duration-200"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              @if (colorFn) {
                <div
                  class="w-1 h-4 rounded-full"
                  [style.background-color]="colorFn(selectedItem()!)"
                ></div>
              } @else {
                <div
                  class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs"
                >
                  {{ displayFn ? displayFn(selectedItem()!)[0] : '?' }}
                </div>
              }

              <div class="flex flex-col min-w-0">
                <span
                  class="text-sm font-bold truncate"
                  [style.color]="colorFn ? colorFn(selectedItem()!) : ''"
                >
                  {{ displayFn ? displayFn(selectedItem()!) : '' }}
                </span>
                @if (descriptionFn) {
                  <span class="text-[11px] text-text-dim truncate">
                    {{ descriptionFn(selectedItem()!) }}
                  </span>
                }
              </div>

              @if (iconFn) {
                <span class="ml-auto text-sm opacity-60">{{
                  iconFn(selectedItem()!)
                }}</span>
              }
            </div>
            <button
              type="button"
              (click)="clearSelection($event)"
              class="text-xs text-text-dim hover:text-red-400 font-bold p-2 transition-colors"
            >
              Cambiar
            </button>
          </div>
        }

        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="trigger"
          [cdkConnectedOverlayOpen]="isOpen()"
          [cdkConnectedOverlayWidth]="triggerWidth()"
          [cdkConnectedOverlayOffsetY]="8"
        >
          <div
            class="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 z-[1000] w-full"
          >
            @if (filteredOptions().length > 0) {
              <div class="max-h-[300px] overflow-y-auto custom-scrollbar">
                @for (item of filteredOptions(); track item; let i = $index) {
                  <button
                    type="button"
                    (mousedown)="selectItem(item)"
                    [class.bg-surface-subtle-hover]="i === selectedIndex()"
                    class="w-full px-4 py-2.5 text-left hover:bg-surface-subtle flex items-center justify-between border-b border-border last:border-0 group transition-colors overflow-hidden"
                  >
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      @if (colorFn) {
                        <div
                          class="w-1 h-4 rounded-full"
                          [style.background-color]="colorFn(item)"
                        ></div>
                      }

                      <div class="flex flex-col min-w-0 flex-1">
                        <span
                          class="text-sm font-bold truncate group-hover:text-primary transition-colors"
                          [style.color]="colorFn ? colorFn(item) : ''"
                          [class.text-primary]="i === selectedIndex()"
                        >
                          {{ displayFn ? displayFn(item) : '' }}
                        </span>
                        @if (descriptionFn) {
                          <span class="text-[11px] text-text-dim truncate">{{
                            descriptionFn(item)
                          }}</span>
                        }
                      </div>

                      @if (iconFn) {
                        <span class="text-sm opacity-60">{{
                          iconFn(item)
                        }}</span>
                      }
                    </div>
                    <span
                      class="text-xs text-primary font-bold transition-all flex-shrink-0 ml-2"
                      [class.opacity-100]="i === selectedIndex()"
                      [class.opacity-0]="i !== selectedIndex()"
                    >
                      Elegir
                    </span>
                  </button>
                }
              </div>
            } @else {
              <div class="p-4 text-center">
                <p class="text-sm text-text-dim">No se encontraron opciones</p>
              </div>
            }
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }

      /* Animations */
      @keyframes zoomIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .animate-in {
        animation: zoomIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }

      .fade-in {
        animation: fadeIn 0.2s ease-out forwards;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent<T = any> implements ControlValueAccessor {
  @Input({ required: true }) config!: SelectConfig<T>;
  @Input({ required: true }) set options(val: T[]) {
    this._options.set(val);
  }
  get options() {
    return this._options();
  }
  private _options = signal<T[]>([]);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Getters simplificados
  get label() {
    return this.config?.label ?? '';
  }
  get placeholder() {
    return this.config?.placeholder ?? 'Seleccionar...';
  }
  get displayFn() {
    return this.config?.displayFn;
  }
  get descriptionFn() {
    return this.config?.descriptionFn;
  }
  get colorFn() {
    return this.config?.colorFn;
  }
  get iconFn() {
    return this.config?.iconFn;
  }
  private get valueFn() {
    return this.config?.valueFn;
  }

  searchControl = new FormControl('');
  searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  isOpen = signal(false);
  selectedItem = signal<T | null>(null);
  selectedIndex = signal(-1);
  pendingValue = signal<any>(null);

  private dialogRef = inject(DialogRef, { optional: true });
  skipFocus = signal(!!this.dialogRef);
  triggerWidth = signal<number | string>('auto');

  // Decidir si habilitar filtrado basado en la cantidad de elementos
  isFilterable = computed(() => this.options.length > 5);

  // Opciones filtradas basadas en el input
  filteredOptions = computed(() => {
    const query = this.searchQuery()?.toLowerCase() || '';
    const options = this._options();
    if (!query) return options;

    return options.filter((opt) => {
      const display = this.displayFn(opt).toLowerCase();
      const description = this.descriptionFn
        ? this.descriptionFn(opt).toLowerCase()
        : '';
      return display.includes(query) || description.includes(query);
    });
  });

  constructor() {
    if (this.skipFocus()) {
      setTimeout(() => this.skipFocus.set(false), 100);
    }

    // Efecto para que el primer elemento siempre esté resaltado al filtrar
    effect(() => {
      const opts = this.filteredOptions();
      if (opts.length > 0) {
        this.selectedIndex.set(0);
      } else {
        this.selectedIndex.set(-1);
      }
    });

    // Efecto para resolver el item seleccionado cuando las opciones cambian
    effect(() => {
      const value = this.pendingValue();
      const options = this._options();

      if (value !== null && options.length > 0) {
        const found = options.find((opt) => {
          const optVal = this.valueFn ? this.valueFn(opt) : opt;
          return optVal === value;
        });

        if (found) {
          this.selectedItem.set(found);
        }
      }
    });
  }

  // ControlValueAccessor methods
  onChange: any = () => {};
  onTouched: any = () => {};

  toggleOpen(): void {
    if (this.selectedItem()) return;
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.triggerWidth.set(this.searchInput.nativeElement.offsetWidth);
      setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
    }
  }

  onFocus(): void {
    if (this.skipFocus()) return;
    this.triggerWidth.set(this.searchInput.nativeElement.offsetWidth);
    this.isOpen.set(true);
  }

  onBlur(): void {
    setTimeout(() => {
      this.isOpen.set(false);
      this.searchControl.setValue('');
    }, 200);
    this.onTouched();
  }

  selectItem(item: T): void {
    this.selectedItem.set(item);
    this.isOpen.set(false);
    this.searchControl.setValue('');
    const value = this.valueFn ? this.valueFn(item) : item;
    this.onChange(value);
  }

  clearSelection(event?: Event): void {
    event?.stopPropagation();
    this.selectedItem.set(null);
    this.onChange(null);
    this.triggerWidth.set(this.searchInput.nativeElement.offsetWidth);
    this.isOpen.set(true);
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 0);
  }

  handleKeyDown(event: KeyboardEvent): void {
    const opts = this.filteredOptions();
    if (opts.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % opts.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + opts.length) % opts.length);
    } else if (event.key === 'Enter') {
      const idx = this.selectedIndex();
      if (idx >= 0 && idx < opts.length) {
        event.preventDefault();
        this.selectItem(opts[idx]);
      }
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
    }
  }

  // ControlValueAccessor Implementation
  writeValue(value: any): void {
    const val = value || '';
    this.searchControl.setValue(val, { emitEvent: false });
    this.pendingValue.set(val);

    // Intentar buscar inmediatamente si ya hay opciones
    const options = this._options();
    if (options.length > 0) {
      const found = options.find((opt) => {
        const optVal = this.valueFn ? this.valueFn(opt) : opt;
        return optVal === val;
      });

      if (found) {
        this.selectedItem.set(found);
      } else {
        this.selectedItem.set(null);
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
