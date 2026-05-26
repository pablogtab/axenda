import { IsString, IsOptional } from 'class-validator';

export class VerifySubscriptionDto {
  @IsString()
  @IsOptional()
  preapproval_id?: string;

  @IsString()
  @IsOptional()
  payment_id?: string;

  @IsString()
  @IsOptional()
  collection_id?: string;
}
