import { Component, input, contentChildren, TemplateRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { TableCellDirective } from './table-cell.directive';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, CdkTableModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css'
})
export class DataTableComponent {
  data = input<any[]>([]);
  columns = input<string[]>([]);
  headers = input<string[]>([]);
  density = input<'normal' | 'compact'>('normal');
  
  templates = contentChildren(TableCellDirective);

  // Garantizar que data siempre sea un array iterable para el template
  safeData = computed(() => Array.isArray(this.data()) ? this.data() : []);

  getTemplateForColumn(columnName: string): TemplateRef<any> | null {
    const directive = this.templates().find(t => t.column() === columnName);
    return directive ? directive.template : null;
  }
}
