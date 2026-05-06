import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { BehaviorSubject, Observable, filter, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private router = inject(Router);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public readonly isLoading$: Observable<boolean> = this.loadingSubject.asObservable();

  private loadingTimeout: any;

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.startLoading();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.stopLoading();
      }
    });

    // Listen for online/offline status
    window.addEventListener('online', () => this.stopLoading());
    window.addEventListener('offline', () => {
      console.warn('App is offline');
      this.stopLoading();
    });
  }

  private startLoading() {
    this.loadingSubject.next(true);
    
    // Safety timeout: stop loading after 15 seconds no matter what
    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
    this.loadingTimeout = setTimeout(() => {
      if (this.loadingSubject.value) {
        console.warn('Loading safety timeout reached. Forcing loader hide.');
        this.stopLoading();
      }
    }, 15000);
  }

  private stopLoading() {
    this.loadingSubject.next(false);
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }
}
