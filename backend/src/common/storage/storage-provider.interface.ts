export interface UploadResponse {
  uploadUrl: string;
  publicUrl: string;
  fileKey: string;
}

export abstract class StorageProvider {
  abstract generateUploadUrl(
    tenantId: string,
    category: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadResponse>;

  abstract deleteFile(fileKey: string): Promise<void>;
}
