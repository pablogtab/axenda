import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploaderService } from '../../../core/services/file-uploader.service';
import { finalize } from 'rxjs';
import { StoragePipe } from '../../pipes/storage.pipe';

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

  @Output() imageUploaded = new EventEmitter<string>();

  private storagePipe = inject(StoragePipe);
  private fileUploader = inject(FileUploaderService);

  isDragging = false;
  isUploading = false;
  uploadProgress = 0;
  previewUrl: string | null = null;

  constructor() {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
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
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.processFile(file);
    }
  }

  private processFile(file: File) {
    // Local preview
    this.previewUrl = URL.createObjectURL(file);
    
    this.isUploading = true;
    this.uploadProgress = 0;

    this.fileUploader.getUploadUrl(this.tenantId, this.category, file).subscribe({
      next: (response) => {
        this.fileUploader.uploadFile(response.uploadUrl, file)
          .pipe(finalize(() => {
            this.isUploading = false;
          }))
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

  removeImage(event: Event) {
    event.stopPropagation();
    this.currentImageUrl = null;
    this.previewUrl = null;
    this.imageUploaded.emit('');
  }
}
