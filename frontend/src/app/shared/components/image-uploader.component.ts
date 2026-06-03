import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploaderService } from '../../core/services/file-uploader.service';
import { finalize } from 'rxjs';
import { StoragePipe } from '../pipes/storage.pipe';

interface UploadingFile {
  name: string;
  previewUrl: string;
  progress: number;
  done: boolean;
}

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  imports: [CommonModule, StoragePipe],
  template: `
    <div class="flex flex-col gap-2">
      <label
        *ngIf="label"
        class="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider block"
        >{{ label }}</label
      >

      <!-- Drop Zone -->
      <div
        (click)="fileInput.click()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        [class.dragging]="isDragging"
        [class.circle]="shape === 'circle'"
        [class.square]="shape === 'square'"
        class="relative cursor-pointer group overflow-hidden border-2 border-dashed transition-all duration-300
           flex items-center justify-center bg-surface-subtle 
           hover:bg-surface-subtle-hover
           border-border hover:border-primary"
        [ngClass]="dimensions"
      >
        <!-- Hidden Input -->
        <input
          #fileInput
          type="file"
          class="hidden"
          accept="image/*"
          [attr.multiple]="isMultiMode ? '' : null"
          (change)="onFileSelected($event)"
        />

        <!-- Background Image / Preview (modo single) -->
        <img
          *ngIf="!isMultiMode && (previewUrl || currentImageUrl)"
          [src]="previewUrl || currentImageUrl | storage"
          class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          [class.opacity-40]="isUploading"
        />

        <!-- Empty State / Multi Mode Drop Area -->
        <div
          *ngIf="
            isMultiMode || (!previewUrl && !currentImageUrl && !isUploading)
          "
          class="flex flex-col items-center gap-2 text-text-dim group-hover:text-primary transition-colors px-4 text-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span class="text-xs font-medium">
            {{ isMultiMode ? 'Subir fotos' : 'Subir foto' }}
          </span>
          <span
            *ngIf="isMultiMode"
            class="text-[10px] text-text-dim leading-tight"
            >Podés seleccionar varias a la vez</span
          >
        </div>

        <!-- Uploading Overlay (modo single) -->
        <div
          *ngIf="!isMultiMode && isUploading"
          class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]"
        >
          <div class="relative w-16 h-16 flex items-center justify-center">
            <svg class="w-full h-full -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                class="stroke-gray-200/30 fill-none"
                stroke-width="4"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                class="stroke-white fill-none transition-all duration-300"
                stroke-width="4"
                [style.strokeDasharray]="175.9"
                [style.strokeDashoffset]="
                  175.9 - (175.9 * uploadProgress) / 100
                "
              />
            </svg>
            <span class="absolute text-xs font-bold text-white"
              >{{ uploadProgress }}%</span
            >
          </div>
        </div>

        <!-- Hover Controls (modo single con imagen) -->
        <div
          *ngIf="
            !isMultiMode && (previewUrl || currentImageUrl) && !isUploading
          "
          class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
        >
          <button
            type="button"
            (click)="$event.stopPropagation(); fileInput.click()"
            class="p-2 bg-white/30 hover:bg-white/50 rounded-full text-white backdrop-blur-md transition-colors"
            title="Cambiar imagen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            type="button"
            (click)="removeImage($event)"
            class="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-200 backdrop-blur-sm transition-colors"
            title="Eliminar imagen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Progress thumbnails (modo multi) -->
      <div
        *ngIf="isMultiMode && uploadingFiles.length > 0"
        class="flex flex-wrap gap-2 mt-1"
      >
        <div
          *ngFor="let f of uploadingFiles"
          class="relative w-16 h-16 rounded-xl overflow-hidden border border-border flex-shrink-0"
        >
          <img
            [src]="f.previewUrl"
            class="w-full h-full object-cover"
            [class.opacity-50]="!f.done"
          />
          <!-- Progress ring overlay -->
          <div
            *ngIf="!f.done"
            class="absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <div class="relative w-10 h-10">
              <svg class="w-full h-full -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  class="stroke-white/20 fill-none"
                  stroke-width="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  class="stroke-white fill-none transition-all duration-200"
                  stroke-width="3"
                  [style.strokeDasharray]="106.8"
                  [style.strokeDashoffset]="106.8 - (106.8 * f.progress) / 100"
                />
              </svg>
              <span
                class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white"
                >{{ f.progress }}%</span
              >
            </div>
          </div>
          <!-- Done checkmark -->
          <div
            *ngIf="f.done"
            class="absolute inset-0 flex items-center justify-center bg-green-500/30"
          >
            <svg
              class="w-6 h-6 text-green-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @reference "../../../styles.css";

      :host {
        display: block;
      }

      .dragging {
        @apply border-primary bg-primary/10 scale-[1.02];
        box-shadow: 0 0 20px var(--color-primary-glow);
      }

      .circle {
        @apply rounded-full;
      }

      .square {
        @apply rounded-2xl;
      }

      /* Glass effect for overlays */
      .backdrop-blur-sm {
        backdrop-filter: blur(4px);
      }

      /* Smooth transitions */
      .group:hover img {
        filter: brightness(0.8);
      }
    `,
  ],
  providers: [StoragePipe],
})
export class ImageUploaderComponent {
  @Input() currentImageUrl: string | null = null;
  @Input() category: string = 'general';
  @Input() tenantId: string = '';
  @Input() label: string = 'Imagen';
  @Input() shape: 'circle' | 'square' = 'square';
  @Input() dimensions: string = 'w-32 h-32';
  /** Si es true, resetea el uploader tras cada subida y permite múltiples archivos */
  @Input() resetAfterUpload: boolean = false;

  @Output() imageUploaded = new EventEmitter<string>();

  private storagePipe = inject(StoragePipe);
  private fileUploader = inject(FileUploaderService);

  isDragging = false;
  // Modo single
  isUploading = false;
  uploadProgress = 0;
  previewUrl: string | null = null;
  // Modo multi (resetAfterUpload)
  uploadingFiles: UploadingFile[] = [];

  get isMultiMode(): boolean {
    return this.resetAfterUpload;
  }

  get isBusy(): boolean {
    if (this.isMultiMode) {
      return this.uploadingFiles.some((f) => !f.done);
    }
    return this.isUploading;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (this.isMultiMode) {
      const files = Array.from(input.files);
      files.forEach((file) => this.processFileMulti(file));
    } else {
      this.processFile(input.files[0]);
    }
    // Resetear el input para permitir re-selección del mismo archivo
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = Array.from(event.dataTransfer?.files || []).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length === 0) return;

    if (this.isMultiMode) {
      files.forEach((file) => this.processFileMulti(file));
    } else {
      this.processFile(files[0]);
    }
  }

  // ── Modo single (comportamiento original) ──────────────────────────────────
  private processFile(file: File) {
    this.previewUrl = URL.createObjectURL(file);
    this.isUploading = true;
    this.uploadProgress = 0;

    this.fileUploader
      .getUploadUrl(this.tenantId, this.category, file)
      .subscribe({
        next: (response) => {
          this.fileUploader
            .uploadFile(response.uploadUrl, file)
            .pipe(
              finalize(() => {
                this.isUploading = false;
              }),
            )
            .subscribe({
              next: (progress) => {
                this.uploadProgress = progress;
                if (progress === 100) {
                  this.imageUploaded.emit(response.fileKey);
                  this.currentImageUrl = response.fileKey;
                }
              },
              error: (err) => {
                console.error('Error uploading file:', err);
                this.isUploading = false;
              },
            });
        },
        error: (err) => {
          console.error('Error getting upload URL:', err);
          this.isUploading = false;
        },
      });
  }

  // ── Modo multi (resetAfterUpload) ──────────────────────────────────────────
  private processFileMulti(file: File) {
    const entry: UploadingFile = {
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      done: false,
    };
    this.uploadingFiles = [...this.uploadingFiles, entry];
    const idx = this.uploadingFiles.length - 1;

    this.fileUploader
      .getUploadUrl(this.tenantId, this.category, file)
      .subscribe({
        next: (response) => {
          this.fileUploader
            .uploadFile(response.uploadUrl, file)
            .pipe(
              finalize(() => {
                // Limpiar entrada completada después de un breve delay visual
                setTimeout(() => {
                  this.uploadingFiles = this.uploadingFiles.filter(
                    (_, i) => i !== idx,
                  );
                }, 600);
              }),
            )
            .subscribe({
              next: (progress) => {
                this.uploadingFiles[idx] = {
                  ...this.uploadingFiles[idx],
                  progress,
                };
                if (progress === 100) {
                  this.uploadingFiles[idx] = {
                    ...this.uploadingFiles[idx],
                    done: true,
                  };
                  this.imageUploaded.emit(response.fileKey);
                }
              },
              error: (err) => {
                console.error('Error uploading file:', err);
                this.uploadingFiles = this.uploadingFiles.filter(
                  (_, i) => i !== idx,
                );
              },
            });
        },
        error: (err) => {
          console.error('Error getting upload URL:', err);
          this.uploadingFiles = this.uploadingFiles.filter((_, i) => i !== idx);
        },
      });
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.currentImageUrl = null;
    this.previewUrl = null;
    this.imageUploaded.emit('');
  }
}
