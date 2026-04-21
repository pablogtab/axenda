import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength, Matches } from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'Mi Negocio' })
  @IsString()
  organizationName: string

  @ApiProperty({
    example: 'mi-negocio',
    description: 'Slug único de la organización (solo letras minúsculas, números y guiones)',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  organizationSlug: string

  @ApiProperty({ example: 'Juan' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'García' })
  @IsString()
  lastName: string

  @ApiProperty({ example: 'admin@minegocio.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string
}
