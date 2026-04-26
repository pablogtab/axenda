import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResponse } from '../storage-provider.interface';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class GcsStorageProvider extends StorageProvider {
  private readonly logger = new Logger(GcsStorageProvider.name);
  private storage: any;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME');
    
    // Lazy load to avoid crash if not installed/configured
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Storage } = require('@google-cloud/storage');
      this.storage = new Storage();
    } catch (e) {
      this.logger.warn('Google Cloud Storage client not initialized. Ensure @google-cloud/storage is installed.');
    }
  }

  async generateUploadUrl(
    tenantId: string,
    category: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadResponse> {
    if (!this.storage) {
      throw new Error('GCS Storage not initialized');
    }

    const fileExtension = path.extname(fileName);
    const fileKey = `tenants/${tenantId}/${category}/${uuidv4()}${fileExtension}`;
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileKey);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return {
      uploadUrl,
      publicUrl: `https://storage.googleapis.com/${this.bucketName}/${fileKey}`,
      fileKey,
    };
  }

  async deleteFile(fileKey: string): Promise<void> {
    if (!this.storage) return;
    try {
      await this.storage.bucket(this.bucketName).file(fileKey).delete();
    } catch (e) {
      this.logger.error(`Error deleting file from GCS: ${fileKey}`, e);
    }
  }
}
