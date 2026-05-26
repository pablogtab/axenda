import { IsString, IsNotEmpty, IsIn, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty({ message: 'El planId es requerido' })
  planId: string;

  @IsString()
  @IsNotEmpty({ message: 'El ciclo de facturación es requerido' })
  @IsIn(['MONTHLY', 'YEARLY'], { message: 'El ciclo de facturación debe ser MONTHLY o YEARLY' })
  billingCycle: 'MONTHLY' | 'YEARLY';

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @IsOptional()
  @Min(1, { message: 'La cantidad mínima es 1' })
  @Max(12, { message: 'La cantidad máxima es 12' })
  quantity?: number;
}
