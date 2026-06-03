import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  signal,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { Subject, Observable, of } from 'rxjs';
import { debounceTime, switchMap, finalize, tap } from 'rxjs/operators';
import { SidebarService } from '@core/services/sidebar.service';
import { DialogRef } from '@angular/cdk/dialog';

export interface SearchableSelectConfig<T = any> {
  label?: string;
  placeholder?: string;
  searchFn: (query: string) => Observable<T[]>;
  displayFn: (item: T) => string;
  descriptionFn?: (item: T) => string;
  valueFn?: (item: T) => any;
  initItemFn?: (value: any) => Observable<T>;
  addLabel?: string;
}

@Component({
  selector: 'app-searchable-select',
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
        <!-- Input de Búsqueda -->
        <input
          #searchInput
          cdkOverlayOrigin
          #trigger="cdkOverlayOrigin"
          type="text"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          [placeholder]="placeholder"
          [tabIndex]="skipFocus() ? -1 : 0"
          (input)="onInput($event)"
          (focus)="onFocus($event)"
          (blur)="onBlur()"
          (keydown)="handleKeyDown($event)"
          [hidden]="selectedItem()"
          class="w-full bg-surface-subtle border border-border rounded-xl px-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
        />

        <!-- Spinner de Carga -->
        @if (isSearching()) {
          <div class="absolute right-4 top-3.5">
            <div
              class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"
            ></div>
          </div>
        }

        <!-- Item Seleccionado -->
        @if (selectedItem()) {
          <div
            class="flex items-center justify-between bg-primary-glow border border-primary/20 rounded-xl px-4 py-2 animate-in fade-in duration-200"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs"
              >
                {{ displayFn ? displayFn(selectedItem()!)[0] : '?' }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-bold text-text-main truncate">
                  {{ displayFn ? displayFn(selectedItem()!) : '' }}
                </span>
                @if (descriptionFn) {
                  <span class="text-[11px] text-text-dim truncate">
                    {{ descriptionFn(selectedItem()!) }}
                  </span>
                }
              </div>
            </div>
            <button
              type="button"
              (click)="clearSelection()"
              class="text-xs text-text-dim hover:text-red-400 font-bold p-2 transition-colors"
            >
              Cambiar
            </button>
          </div>
        }

        <!-- Overlay de Resultados -->
        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="trigger"
          [cdkConnectedOverlayOpen]="
            results().length > 0 ||
            (searchInput.value.length > 0 && !isSearching() && !selectedItem())
          "
          [cdkConnectedOverlayWidth]="triggerWidth()"
          [cdkConnectedOverlayOffsetY]="8"
        >
          <div
            class="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 z-[1000] w-full"
          >
            @if (results().length > 0) {
              <div class="max-h-[300px] overflow-y-auto custom-scrollbar">
                @for (item of results(); track item; let i = $index) {
                  <button
                    type="button"
                    (click)="selectItem(item)"
                    [class.bg-surface-subtle-hover]="i === selectedIndex()"
                    class="w-full px-4 py-2.5 text-left hover:bg-surface-subtle flex items-center justify-between border-b border-border last:border-0 group transition-colors overflow-hidden"
                  >
                    <div class="flex flex-col min-w-0 flex-1">
                      <span
                        class="text-sm font-bold text-text-main group-hover:text-primary transition-colors truncate"
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
            } @else if (
              searchInput.value.length > 0 && !isSearching() && !selectedItem()
            ) {
              <div class="p-4 text-center">
                <p class="text-sm text-text-dim">
                  No se encontraron resultados para "<span
                    class="text-text-main font-bold"
                    >{{ searchInput.value }}</span
                  >"
                </p>
              </div>
            }
            @if (config.addLabel) {
              <button
                type="button"
                (click)="onAddClick()"
                class="w-full px-4 py-3 text-left hover:bg-primary-glow border-t border-border flex items-center gap-3 group transition-colors"
              >
                <span class="text-lg group-hover:scale-110 transition-transform"
                  >👤+</span
                >
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-primary">{{
                    config.addLabel
                  }}</span>
                  @if (searchInput.value) {
                    <span class="text-[11px] text-text-dim"
                      >Crear nuevo con "{{ searchInput.value }}"</span
                    >
                  } @else {
                    <span class="text-[11px] text-text-dim"
                      >Registrar nueva entidad</span
                    >
                  }
                </div>
              </button>
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
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent<
  T = any,
> implements ControlValueAccessor {
  @Input({ required: true }) config!: SearchableSelectConfig<T>;
  @Output() onAdd = new EventEmitter<string>();

  // Getters simplificados (públicos para el HTML)
  get label() {
    return this.config?.label ?? '';
  }
  get placeholder() {
    return this.config?.placeholder ?? 'Buscar...';
  }
  get displayFn() {
    return this.config?.displayFn;
  }
  get descriptionFn() {
    return this.config?.descriptionFn;
  }

  // Getters internos para lógica
  private get searchFn() {
    return this.config?.searchFn;
  }
  private get valueFn() {
    return this.config?.valueFn;
  }
  private get initItemFn() {
    return this.config?.initItemFn;
  }

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  results = signal<T[]>([]);
  selectedItem = signal<T | null>(null);
  isSearching = signal(false);
  selectedIndex = signal(-1);
  sidebarService = inject(SidebarService);
  private dialogRef = inject(DialogRef, { optional: true });

  // Flag para evitar el autofocus inicial del CDK cuando estamos en un modal
  skipFocus = signal(!!this.dialogRef);
  triggerWidth = signal<number | string>('auto');

  private searchSubject = new Subject<string>();

  // ControlValueAccessor methods
  onChange: any = () => {};
  onTouched: any = () => {};

  constructor() {
    this.setupSearch();

    // Si estamos en un diálogo, esperamos un poco antes de permitir el foco
    // para que el "focus trap" del CDK pase de largo.
    if (this.skipFocus()) {
      setTimeout(() => this.skipFocus.set(false), 100);
    }
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap((query) => {
          this.selectedIndex.set(-1);

          this.isSearching.set(true);
          const search = this.searchFn;
          if (!search) return of([]);
          return search(query).pipe(
            finalize(() => this.isSearching.set(false)),
          );
        }),
      )
      .subscribe((res) => this.results.set(res));
  }

  onInput(event: Event): void {
    this.triggerWidth.set(this.searchInput.nativeElement.offsetWidth);
    const val = (event.target as HTMLInputElement).value;
    this.searchSubject.next(val);
  }

  onFocus(event: Event): void {
    if (this.skipFocus()) return;
    this.triggerWidth.set(this.searchInput.nativeElement.offsetWidth);
    const val = (event.target as HTMLInputElement).value;
    this.searchSubject.next(val);
  }

  onBlur(): void {
    setTimeout(() => {
      this.results.set([]);
    }, 200);
    this.onTouched();
  }

  selectItem(item: T): void {
    this.selectedItem.set(item);
    this.results.set([]);
    const valueFn = this.valueFn;
    const value = valueFn ? valueFn(item) : item;
    this.onChange(value);
  }

  clearSelection(): void {
    this.selectedItem.set(null);
    this.onChange(null);
    this.triggerWidth.set(this.searchInput.nativeElement.offsetWidth);
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 0);
  }

  onAddClick(): void {
    this.onAdd.emit(this.searchInput.nativeElement.value);
    this.results.set([]);
  }

  handleKeyDown(event: KeyboardEvent): void {
    const res = this.results();
    if (res.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % res.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + res.length) % res.length);
    } else if (event.key === 'Enter' && this.selectedIndex() >= 0) {
      event.preventDefault();
      this.selectItem(res[this.selectedIndex()]);
    } else if (event.key === 'Escape') {
      this.results.set([]);
    }
  }

  // ControlValueAccessor Implementation
  writeValue(value: any): void {
    if (!value) {
      this.selectedItem.set(null);
      return;
    }

    if (typeof value === 'object' && value !== null) {
      this.selectedItem.set(value);
    } else {
      const initFn = this.initItemFn;
      if (initFn) {
        initFn(value).subscribe((item) => this.selectedItem.set(item));
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
