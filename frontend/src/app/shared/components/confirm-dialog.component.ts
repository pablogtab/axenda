import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogOptions } from '@services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-bg-secondary rounded-2xl border border-border shadow-2xl overflow-hidden w-full max-w-sm animate-in fade-in zoom-in duration-300"
    >
      <div class="p-6 text-center space-y-4">
        <header class="space-y-2">
          <div
            class="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-surface-subtle border border-border mb-4"
          >
            @if (data.type === 'danger') {
              <i
                class="fa-solid fa-triangle-exclamation text-red-500 text-xl"
              ></i>
            } @else if (data.type === 'warning') {
              <i
                class="fa-solid fa-circle-exclamation text-amber-500 text-xl"
              ></i>
            } @else {
              <i class="fa-solid fa-circle-info text-blue-500 text-xl"></i>
            }
          </div>
          <h2
            class="text-xl font-bold text-text-main"
            [class.text-red-500]="data.type === 'danger'"
          >
            {{ data.title }}
          </h2>
        </header>

        <div class="text-sm text-text-dim leading-relaxed">
          {{ data.message }}
        </div>

        <footer class="flex gap-3 pt-2">
          <button
            class="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-main font-bold hover:bg-surface-subtle-hover transition-all text-sm"
            (click)="onCancel()"
          >
            {{ data.cancelText }}
          </button>
          <button
            class="flex-[1.5] text-white font-bold py-2.5 rounded-xl shadow-lg transition-all text-sm"
            [class.bg-red-500]="data.type === 'danger'"
            [class.hover:bg-red-600]="data.type === 'danger'"
            [class.shadow-red-500/20]="data.type === 'danger'"
            [class.bg-primary]="data.type !== 'danger'"
            [class.hover:bg-primary-hover]="data.type !== 'danger'"
            (click)="onConfirm()"
          >
            {{ data.confirmText }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }

      .dialog-card {
        width: 90%;
        max-width: 400px;
        background: #ffffff;
        border-radius: 24px;
        padding: 2rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(0, 0, 0, 0.05);
        animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        text-align: center;
      }

      .dialog-header h2 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .dialog-header h2.danger {
        color: #ef4444;
      }
      .dialog-header h2.info {
        color: #4f46e5;
      }
      .dialog-header h2.warning {
        color: #f59e0b;
      }

      .dialog-body p {
        color: #4a5568;
        line-height: 1.6;
        margin-bottom: 2rem;
      }

      .dialog-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }

      .btn {
        padding: 0.8rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        flex: 1;
      }

      .btn-secondary {
        background: #edf2f7;
        color: #4a5568;
      }

      .btn-secondary:hover {
        background: #e2e8f0;
      }

      .btn-danger {
        background: #ef4444;
        color: white;
      }

      .btn-danger:hover {
        background: #dc2626;
        transform: translateY(-2px);
      }

      .btn-info {
        background: #4f46e5;
        color: white;
      }

      .btn-info:hover {
        background: #4338ca;
        transform: translateY(-2px);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  public dialogRef = inject(DialogRef<boolean>);
  public data: DialogOptions = inject(DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
