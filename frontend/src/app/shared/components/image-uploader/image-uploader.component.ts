import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploaderService } from '../../../core/services/file-uploader.service';
import { finalize } from 'rxjs';
import { StoragePipe } from '../../pipes/storage.pipe';

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
  templateUrl: './image-uploader.component.html',
  styleUrl: './image-uploader.component.css',
  providers: [StoragePipe]
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
      return this.uploadingFiles.some(f => !f.done);
    }
    return this.isUploading;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (this.isMultiMode) {
      const files = Array.from(input.files);
      files.forEach(file => this.processFileMulti(file));
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
    const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    if (this.isMultiMode) {
      files.forEach(file => this.processFileMulti(file));
    } else {
      this.processFile(files[0]);
    }
  }

  // ── Modo single (comportamiento original) ──────────────────────────────────
  private processFile(file: File) {
    this.previewUrl = URL.createObjectURL(file);
    this.isUploading = true;
    this.uploadProgress = 0;

    this.fileUploader.getUploadUrl(this.tenantId, this.category, file).subscribe({
      next: (response) => {
        this.fileUploader.uploadFile(response.uploadUrl, file)
          .pipe(finalize(() => { this.isUploading = false; }))
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
            }
          });
      },
      error: (err) => {
        console.error('Error getting upload URL:', err);
        this.isUploading = false;
      }
    });
  }

  // ── Modo multi (resetAfterUpload) ──────────────────────────────────────────
  private processFileMulti(file: File) {
    const entry: UploadingFile = {
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      done: false
    };
    this.uploadingFiles = [...this.uploadingFiles, entry];
    const idx = this.uploadingFiles.length - 1;

    this.fileUploader.getUploadUrl(this.tenantId, this.category, file).subscribe({
      next: (response) => {
        this.fileUploader.uploadFile(response.uploadUrl, file)
          .pipe(finalize(() => {
            // Limpiar entrada completada después de un breve delay visual
            setTimeout(() => {
              this.uploadingFiles = this.uploadingFiles.filter((_, i) => i !== idx);
            }, 600);
          }))
          .subscribe({
            next: (progress) => {
              this.uploadingFiles[idx] = { ...this.uploadingFiles[idx], progress };
              if (progress === 100) {
                this.uploadingFiles[idx] = { ...this.uploadingFiles[idx], done: true };
                this.imageUploaded.emit(response.fileKey);
              }
            },
            error: (err) => {
              console.error('Error uploading file:', err);
              this.uploadingFiles = this.uploadingFiles.filter((_, i) => i !== idx);
            }
          });
      },
      error: (err) => {
        console.error('Error getting upload URL:', err);
        this.uploadingFiles = this.uploadingFiles.filter((_, i) => i !== idx);
      }
    });
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.currentImageUrl = null;
    this.previewUrl = null;
    this.imageUploaded.emit('');
  }
}
