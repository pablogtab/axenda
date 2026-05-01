import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterStartDto {
  @ApiProperty({ example: 'Mi Negocio' })
  @IsString()
  organizationName: string

  @ApiProperty({ example: 'admin@minegocio.com' })
  @IsEmail()
  email: string
}

export class RegisterCompleteDto {
  @ApiProperty({ example: 'admin@minegocio.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code: string

  @ApiProperty({ example: 'Juan' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'García' })
  @IsString()
  lastName: string

  @ApiProperty({ example: 'Password123!', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string
}
