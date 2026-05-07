import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `{{ name }}`,
  host: {
    '[class.material-symbols-rounded]': 'variant === "rounded"',
    '[class.material-symbols-outlined]': 'variant === "outlined"',
    'translate': 'no',
    '[class.notranslate]': 'true'
  }
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() variant: 'rounded' | 'outlined' = 'rounded';
}
