import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading$ | async) {
      <div class="loading-container">
        <div class="loading-bar-wrapper">
          <div class="loading-bar"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      pointer-events: none;
    }

    .loading-bar-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.05);
      overflow: hidden;
    }

    .loading-bar {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, 
        transparent 0%, 
        var(--color-primary) 50%, 
        var(--color-accent) 100%
      );
      background-size: 200% 100%;
      animation: progress-move 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      box-shadow: 0 0 15px var(--color-primary-glow);
    }

    .spinner-overlay {
      position: absolute;
      top: 20px;
      right: 20px;
      pointer-events: none;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid var(--color-primary);
      border-right: 3px solid var(--color-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      filter: drop-shadow(0 0 5px var(--color-primary-glow));
    }

    @keyframes progress-move {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]

})
export class LoadingBarComponent {
  public loadingService = inject(LoadingService);
}
