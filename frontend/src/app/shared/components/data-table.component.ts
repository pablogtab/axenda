import {
  Component,
  input,
  contentChildren,
  TemplateRef,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { TableCellDirective } from './table-cell.directive';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, CdkTableModule],
  template: `
    <table class="w-full border-collapse text-left bg-transparent">
      <thead>
        <tr class="bg-[var(--color-table-header)] border-b-2 border-border/50">
          @for (header of headers(); track $index) {
            <th
              [class.px-6]="density() === 'normal'"
              [class.py-4]="density() === 'normal'"
              [class.px-4]="
                density() === 'compact' && columns()[$index] !== 'actions'
              "
              [class.px-2]="
                density() === 'compact' && columns()[$index] === 'actions'
              "
              [class.py-3]="density() === 'compact'"
              [class.text-right]="columns()[$index] === 'actions'"
              class="text-[0.65rem] font-black text-text-muted uppercase tracking-[0.15em]"
            >
              {{ header }}
            </th>
          }
        </tr>
      </thead>
      <tbody class="divide-y divide-border/30">
        @for (item of safeData(); track $index) {
          <tr class="transition-colors hover:bg-surface-subtle group">
            @for (column of columns(); track column) {
              <td
                [class.px-6]="density() === 'normal'"
                [class.py-4]="density() === 'normal'"
                [class.px-4]="density() === 'compact' && column !== 'actions'"
                [class.px-2]="density() === 'compact' && column === 'actions'"
                [class.py-1.5]="density() === 'compact'"
                [class.text-right]="column === 'actions'"
                [class.w-1]="column === 'actions'"
                class="align-middle text-text-main"
              >
                @if (getTemplateForColumn(column)) {
                  <ng-container
                    [ngTemplateOutlet]="getTemplateForColumn(column)!"
                    [ngTemplateOutletContext]="{ $implicit: item }"
                  ></ng-container>
                } @else {
                  {{ item[column] }}
                }
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    `
      /* Transform table to cards on mobile */
      @media (max-width: 640px) {
        :host {
          display: block;
          width: 100%;
        }

        table {
          display: block;
          width: 100%;
          border: none !important;
        }

        thead {
          display: none; /* Hide headers on mobile */
        }

        tbody {
          display: block;
          width: 100%;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        tr {
          display: block;
          width: 100%;
          background: var(--color-surface-subtle);
          border: 1px solid var(--color-border);
          border-radius: 1rem;
          padding: 0.75rem;
          position: relative;
          transition: all 0.2s ease;
        }

        tr:hover {
          background: var(--color-surface-subtle-hover);
          border-color: var(--color-primary);
        }

        td {
          display: block;
          width: 100% !important;
          padding: 0.125rem 0 !important;
          border: none !important;
          text-align: left !important;
        }

        /* Special handling for specific columns if needed */

        td:last-child {
          border-top: 1px solid var(--color-border) !important;
          margin-top: 0.125rem;
          padding-top: 0.25rem !important;
          display: flex;
          justify-content: flex-end;
          gap: 0.25rem;
        }
      }
    `,
  ],
})
export class DataTableComponent {
  data = input<any[]>([]);
  columns = input<string[]>([]);
  headers = input<string[]>([]);
  density = input<'normal' | 'compact'>('normal');

  templates = contentChildren(TableCellDirective);

  // Garantizar que data siempre sea un array iterable para el template
  safeData = computed(() => (Array.isArray(this.data()) ? this.data() : []));

  getTemplateForColumn(columnName: string): TemplateRef<any> | null {
    const directive = this.templates().find((t) => t.column() === columnName);
    return directive ? directive.template : null;
  }
}
