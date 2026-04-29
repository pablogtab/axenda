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

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingSubject.next(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.loadingSubject.next(false);
      }
    });
  }
}
