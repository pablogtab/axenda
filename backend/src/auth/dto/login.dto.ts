import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsOptional, IsString } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'admin@minegocio.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  password: string

  @ApiPropertyOptional({
    example: 'mi-negocio',
    description: 'Slug de la organización (requerido si el email existe en múltiples tenants)',
  })
  @IsOptional()
  @IsString()
  tenantSlug?: string
}
