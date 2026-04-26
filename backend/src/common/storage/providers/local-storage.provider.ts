import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResponse } from '../storage-provider.interface';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir = 'uploads';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async generateUploadUrl(
    tenantId: string,
    category: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadResponse> {
    const apiURL = this.configService.get<string>('API_URL') || 'http://localhost:3000';
    const fileExtension = path.extname(fileName);
    const fileKey = `tenants/${tenantId}/${category}/${uuidv4()}${fileExtension}`;
    
    // In local mode, the upload URL points to our own backend simulation endpoint
    const uploadUrl = `${apiURL}/api/storage/local-upload?key=${encodeURIComponent(fileKey)}`;
    
    // The public URL is where the file will be served statically
    const publicUrl = `${apiURL}/${this.uploadDir}/${fileKey}`;

    return {
      uploadUrl,
      publicUrl,
      fileKey,
    };
  }

  async deleteFile(fileKey: string): Promise<void> {
    // Implementation for local deletion if needed
    this.logger.log(`Mocking deletion of file: ${fileKey}`);
  }
}
