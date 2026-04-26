import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageController } from './storage.controller';
import { StorageProvider } from './storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { GcsStorageProvider } from './providers/gcs-storage.provider';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    {
      provide: StorageProvider,
      useFactory: (configService: ConfigService) => {
        const type = configService.get<string>('STORAGE_TYPE') || 'local';
        return type === 'gcs' 
          ? new GcsStorageProvider(configService) 
          : new LocalStorageProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageProvider],
})
export class StorageModule {}
