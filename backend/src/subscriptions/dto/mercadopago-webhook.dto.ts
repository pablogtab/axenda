import { IsString, IsOptional, ValidateNested, IsObject, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class WebhookDataDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class MercadoPagoWebhookDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WebhookDataDto)
  data?: WebhookDataDto;
}
