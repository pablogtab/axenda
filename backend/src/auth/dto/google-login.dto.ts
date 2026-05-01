import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID Token devuelto por Google' })
  @IsString()
  @IsNotEmpty()
  idToken: string

  @ApiProperty({ description: 'Token de validación de Turnstile' })
  @IsString()
  @IsOptional()
  turnstileToken?: string
}
