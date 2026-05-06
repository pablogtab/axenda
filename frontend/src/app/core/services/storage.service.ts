import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  
  get<T>(key: string, defaultValue: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return defaultValue;
      
      try {
        return JSON.parse(saved) as T;
      } catch {
        // Si no es JSON (como un string simple), lo devolvemos tal cual
        return saved as unknown as T;
      }
    } catch (e) {
      console.error('StorageService.get failed', e);
      return defaultValue;
    }
  }

  set(key: string, value: any): void {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, stringValue);
    } catch (e) {
      console.error('StorageService.set failed', e);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('StorageService.remove failed', e);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('StorageService.clear failed', e);
    }
  }
}
