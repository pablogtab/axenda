import {
  Controller,
  Post,
  Body,
  Put,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { StorageProvider } from './storage-provider.interface';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageProvider: StorageProvider) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Generate a signed URL for file upload' })
  async getUploadUrl(
    @Body() body: { fileName: string; contentType: string; category: string; tenantId: string },
  ) {
    const { fileName, contentType, category, tenantId } = body;
    if (!fileName || !contentType || !category || !tenantId) {
      throw new BadRequestException('Missing required fields');
    }
    return this.storageProvider.generateUploadUrl(tenantId, category, fileName, contentType);
  }

  // This endpoint SIMULATES GCS behavior for local development
  @Put('local-upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate GCS PUT upload (Local Dev Only)' })
  async localUpload(@Query('key') key: string, @Req() req: Request) {
    if (process.env.NODE_ENV === 'production' && !(this.storageProvider.constructor.name === 'LocalStorageProvider')) {
      throw new BadRequestException('Local upload only allowed in development');
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);

      writeStream.on('finish', () => resolve({ message: 'File uploaded successfully' }));
      writeStream.on('error', (err) => reject(err));
    });
  }
}
