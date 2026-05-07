import { Component, Input, Output, EventEmitter, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div (click)="close.emit()" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      <div class="relative bg-surface border border-border rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
          <!-- Header -->
          <div class="p-6 pb-0 flex justify-between items-center">
              <h3 class="text-xl font-bold text-text-main flex items-center gap-2">
                  <app-icon name="qr_code_2" class="text-primary"></app-icon> {{ title }}
              </h3>
              <button (click)="close.emit()" class="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-text-muted hover:bg-surface-subtle-hover transition-all">✕</button>
          </div>

          <!-- Content -->
          <div class="p-8 flex flex-col items-center gap-6">
              <div class="bg-white p-4 rounded-3xl shadow-2xl relative group overflow-hidden">
                  @if (qrCodeDataUrl()) {
                    <img [src]="qrCodeDataUrl()" alt="QR Code" class="w-full h-auto min-w-[200px] min-h-[200px]">
                  } @else {
                    <div class="w-48 h-48 flex items-center justify-center">
                      <div class="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  }
              </div>
              
              <div class="text-center">
                  <p class="text-text-main font-bold text-sm">{{ subtitle }}</p>
                  <p class="text-text-muted text-[10px] mt-1">{{ description }}</p>
              </div>

              <div class="flex gap-3 w-full">
                  <button (click)="downloadQR()" class="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">
                      Descargar PNG
                  </button>
                  <button (click)="close.emit()" class="flex-1 py-3 rounded-2xl bg-surface-subtle border border-border text-text-main font-bold text-sm hover:bg-surface-subtle-hover transition-all active:scale-95">
                      Cerrar
                  </button>
              </div>
          </div>
      </div>
    </div>
  `
})
export class QrDialogComponent implements OnInit {
  @Input({ required: true }) url!: string;
  @Input() title: string = 'Código QR';
  @Input() subtitle: string = 'Escaneame para reservar';
  @Input() description: string = 'Comparte este código con tus clientes o imprímelo.';
  
  @Output() close = new EventEmitter<void>();

  qrCodeDataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.url) {
        this.generateQR();
      }
    });
  }

  ngOnInit() {
    this.generateQR();
  }

  async generateQR() {
    if (!this.url) return;

    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, this.url, {
        width: 1000,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const size = canvas.width;
        const logoSize = size * 0.22;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;

        ctx.fillStyle = '#ffffff';
        const radius = logoSize * 0.25;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + logoSize - radius, y);
        ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + radius);
        ctx.lineTo(x + logoSize, y + logoSize - radius);
        ctx.quadraticCurveTo(x + logoSize, y + logoSize, x + logoSize - radius, y + logoSize);
        ctx.lineTo(x + radius, y + logoSize);
        ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        const logoImg = new Image();
        logoImg.src = 'assets/logo.svg';
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve;
        });

        if (logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        } else {
          ctx.fillStyle = '#6366f1';
          ctx.font = `900 ${logoSize * 0.7}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('A', size / 2, size / 2 + (logoSize * 0.05));
        }
      }

      this.qrCodeDataUrl.set(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Error generating QR:', err);
    }
  }

  downloadQR() {
    const dataUrl = this.qrCodeDataUrl();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-axenda.png`;
    link.click();
  }
}
