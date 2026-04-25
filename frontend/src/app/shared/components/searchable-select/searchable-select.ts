import { Component, Input, Output, EventEmitter, forwardRef, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { Subject, Observable, of } from 'rxjs';
import { debounceTime, switchMap, finalize, tap } from 'rxjs/operators';
import { SidebarService } from '@core/services/sidebar.service';

export interface SearchableSelectConfig<T = any> {
  label?: string;
  placeholder?: string;
  searchFn: (query: string) => Observable<T[]>;
  displayFn: (item: T) => string;
  descriptionFn?: (item: T) => string;
  valueFn?: (item: T) => any;
  initItemFn?: (value: any) => Observable<T>;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OverlayModule],
  templateUrl: './searchable-select.html',
  styleUrls: ['./searchable-select.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ]
})
export class SearchableSelectComponent<T = any> implements ControlValueAccessor {
  @Input({ required: true }) config!: SearchableSelectConfig<T>;

  // Getters simplificados (públicos para el HTML)
  get label() { return this.config?.label ?? ''; }
  get placeholder() { return this.config?.placeholder ?? 'Buscar...'; }
  get displayFn() { return this.config?.displayFn; }
  get descriptionFn() { return this.config?.descriptionFn; }
  
  // Getters internos para lógica
  private get searchFn() { return this.config?.searchFn; }
  private get valueFn() { return this.config?.valueFn; }
  private get initItemFn() { return this.config?.initItemFn; }

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  results = signal<T[]>([]);
  selectedItem = signal<T | null>(null);
  isSearching = signal(false);
  selectedIndex = signal(-1);
  sidebarService = inject(SidebarService);
  
  private searchSubject = new Subject<string>();

  // ControlValueAccessor methods
  onChange: any = () => {};
  onTouched: any = () => {};

  constructor() {
    this.setupSearch();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(query => {
        this.selectedIndex.set(-1);

        // Si el query es vacío, simplemente limpiamos y no buscamos
        if (query.trim().length === 0) {
          this.isSearching.set(false);
          return of([]);
        }

        this.isSearching.set(true);
        const search = this.searchFn;
        if (!search) return of([]);
        return search(query).pipe(
          finalize(() => this.isSearching.set(false))
        );
      })
    ).subscribe(res => this.results.set(res));
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchSubject.next(val);
  }

  onFocus(event: Event): void {
    const val = (event.target as HTMLInputElement).value;

    // CLAVE PARA MÓVILES EN DIÁLOGOS:
    // Al abrir un diálogo, el CDK enfoca automáticamente el primer campo.
    // Si el campo está vacío, ignoramos este primer foco para evitar que el buscador 
    // se abra solo y compita con la animación del teclado/diálogo.
    if (this.sidebarService.isMobile() && val.trim().length === 0) return;

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
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 0);
  }

  handleKeyDown(event: KeyboardEvent): void {
    const res = this.results();
    if (res.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(i => (i + 1) % res.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + res.length) % res.length);
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
        initFn(value).subscribe(item => this.selectedItem.set(item));
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
