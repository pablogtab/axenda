import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

declare var turnstile: any;

@Component({
  selector: 'app-turnstile',
  standalone: true,
  imports: [CommonModule],
  template: `<div #turnstileContainer></div>`,
  styles: [`:host { display: block; min-height: 65px; }`]
})
export class TurnstileComponent implements AfterViewInit, OnDestroy {
  @ViewChild('turnstileContainer') container!: ElementRef;
  @Output() resolved = new EventEmitter<string | null>();
  
  private widgetId: string | null = null;

  ngAfterViewInit(): void {
    this.renderWidget();
  }

  ngOnDestroy(): void {
    if (this.widgetId && typeof turnstile !== 'undefined') {
      turnstile.remove(this.widgetId);
    }
  }

  private renderWidget(): void {
    if (typeof turnstile === 'undefined') {
      setTimeout(() => this.renderWidget(), 500);
      return;
    }

    this.widgetId = turnstile.render(this.container.nativeElement, {
      sitekey: environment.turnstileSiteKey,
      callback: (token: string) => {
        this.resolved.emit(token);
      },
      'expired-callback': () => {
        this.resolved.emit(null);
      },
      'error-callback': () => {
        this.resolved.emit(null);
      },
      theme: 'dark'
    });
  }

  reset(): void {
    if (this.widgetId && typeof turnstile !== 'undefined') {
      turnstile.reset(this.widgetId);
    }
  }
}
