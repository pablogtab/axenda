import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  
  get<T>(key: string, defaultValue: T): T {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    
    try {
      return JSON.parse(saved) as T;
    } catch {
      // Si no es JSON (como un string simple), lo devolvemos tal cual
      return saved as unknown as T;
    }
  }

  set(key: string, value: any): void {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    localStorage.setItem(key, stringValue);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
