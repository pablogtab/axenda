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
  data = input.required<any[]>();
  columns = input.required<string[]>();
  headers = input.required<string[]>();
  
  cellTemplates = contentChildren(TableCellDirective);

  // Garantizar que data siempre sea un array iterable para el template
  safeData = computed(() => Array.isArray(this.data()) ? this.data() : []);

  getTemplateForColumn(columnName: string): TemplateRef<any> | null {
    const directive = this.cellTemplates().find(t => t.column() === columnName);
    return directive ? directive.template : null;
  }
}
