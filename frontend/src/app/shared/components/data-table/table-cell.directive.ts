import { Directive, input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTableCell]',
  standalone: true
})
export class TableCellDirective {
  column = input.required<string>({ alias: 'appTableCell' });
  constructor(public template: TemplateRef<any>) {}
}
