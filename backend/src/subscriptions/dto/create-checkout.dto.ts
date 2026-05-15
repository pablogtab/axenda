import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty({ message: 'El planId es requerido' })
  planId: string;

  @IsString()
  @IsNotEmpty({ message: 'El ciclo de facturación es requerido' })
  @IsIn(['MONTHLY', 'YEARLY'], { message: 'El ciclo de facturación debe ser MONTHLY o YEARLY' })
  billingCycle: 'MONTHLY' | 'YEARLY';
}
