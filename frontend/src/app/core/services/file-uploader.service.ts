import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResponse {
  uploadUrl: string;
  publicUrl: string;
  fileKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploaderService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Pide al backend una URL firmada para subir un archivo
   */
  getUploadUrl(
    tenantId: string,
    category: string,
    file: File
  ): Observable<UploadResponse> {
    return this.http.post<UploadResponse>(`${this.apiUrl}/storage/upload-url`, {
      fileName: file.name,
      contentType: file.type,
      category,
      tenantId
    });
  }

  /**
   * Sube el archivo directamente a la URL (GCS o Local Simulation)
   */
  uploadFile(uploadUrl: string, file: File): Observable<number> {
    return this.http.put(uploadUrl, file, {
      reportProgress: true,
      observe: 'events',
      headers: {
        'Content-Type': file.type
      }
    }).pipe(
      map(event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            return Math.round((100 * event.loaded) / (event.total || 100));
          case HttpEventType.Response:
            return 100;
          default:
            return 0;
        }
      })
    );
  }
}
