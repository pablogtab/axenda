import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'storage',
  standalone: true
})
export class StoragePipe implements PipeTransform {
  transform(value: string | null | undefined): string | null {
    if (!value) return null;
    
    // Si ya es una URL completa (http, data o blob), la devolvemos tal cual
    if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) {
      return value;
    }
    
    // De lo contrario, asumimos que es una key y le anteponemos la base URL
    const baseUrl = environment.storageBaseUrl;
    return `${baseUrl}/${value}`;
  }
}
