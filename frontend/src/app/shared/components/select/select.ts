import { Component, Input, forwardRef, signal, ViewChild, ElementRef, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl } from '@angular/forms';
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
  templateUrl: './select.html',
  styleUrls: ['./select.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent<T = any> implements ControlValueAccessor {
  @Input({ required: true }) config!: SelectConfig<T>;
  @Input({ required: true }) set options(val: T[]) {
    this._options.set(val);
  }
  get options() { return this._options(); }
  private _options = signal<T[]>([]);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Getters simplificados
  get label() { return this.config?.label ?? ''; }
  get placeholder() { return this.config?.placeholder ?? 'Seleccionar...'; }
  get displayFn() { return this.config?.displayFn; }
  get descriptionFn() { return this.config?.descriptionFn; }
  get colorFn() { return this.config?.colorFn; }
  get iconFn() { return this.config?.iconFn; }
  private get valueFn() { return this.config?.valueFn; }

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
    
    return options.filter(opt => {
      const display = this.displayFn(opt).toLowerCase();
      const description = this.descriptionFn ? this.descriptionFn(opt).toLowerCase() : '';
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
        const found = options.find(opt => {
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
  onChange: any = () => { };
  onTouched: any = () => { };

  toggleOpen(): void {
    if (this.selectedItem()) return;
    this.isOpen.update(v => !v);
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
      this.selectedIndex.update(i => (i + 1) % opts.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + opts.length) % opts.length);
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
      const found = options.find(opt => {
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
