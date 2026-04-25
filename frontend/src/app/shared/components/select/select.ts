import { Component, Input, forwardRef, signal, ViewChild, ElementRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { DialogRef } from '@angular/cdk/dialog';

export interface SelectConfig<T = any> {
  label?: string;
  placeholder?: string;
  displayFn: (item: T) => string;
  descriptionFn?: (item: T) => string;
  valueFn?: (item: T) => any;
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
  @Input({ required: true }) options: T[] = [];

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Getters simplificados
  get label() { return this.config?.label ?? ''; }
  get placeholder() { return this.config?.placeholder ?? 'Seleccionar...'; }
  get displayFn() { return this.config?.displayFn; }
  get descriptionFn() { return this.config?.descriptionFn; }
  private get valueFn() { return this.config?.valueFn; }

  searchControl = new FormControl('');
  isOpen = signal(false);
  selectedItem = signal<T | null>(null);
  selectedIndex = signal(-1);
  
  private dialogRef = inject(DialogRef, { optional: true });
  skipFocus = signal(!!this.dialogRef);

  // Opciones filtradas basadas en el input
  filteredOptions = computed(() => {
    const query = this.searchControl.value?.toLowerCase() || '';
    if (!query) return this.options;
    
    return this.options.filter(opt => {
      const display = this.displayFn(opt).toLowerCase();
      const description = this.descriptionFn ? this.descriptionFn(opt).toLowerCase() : '';
      return display.includes(query) || description.includes(query);
    });
  });

  constructor() {
    if (this.skipFocus()) {
      setTimeout(() => this.skipFocus.set(false), 100);
    }
  }

  // ControlValueAccessor methods
  onChange: any = () => {};
  onTouched: any = () => {};

  toggleOpen(): void {
    if (this.selectedItem()) return;
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
    }
  }

  onFocus(): void {
    if (this.skipFocus()) return;
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
    } else if (event.key === 'Enter' && this.selectedIndex() >= 0) {
      event.preventDefault();
      this.selectItem(opts[this.selectedIndex()]);
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
    }
  }

  // ControlValueAccessor Implementation
  writeValue(value: any): void {
    if (value === null || value === undefined) {
      this.selectedItem.set(null);
      return;
    }

    // Buscar el item en las opciones si recibimos un valor simple (ID)
    const found = this.options.find(opt => {
      const optVal = this.valueFn ? this.valueFn(opt) : opt;
      return optVal === value;
    });

    if (found) {
      this.selectedItem.set(found);
    } else if (typeof value === 'object') {
      this.selectedItem.set(value);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
