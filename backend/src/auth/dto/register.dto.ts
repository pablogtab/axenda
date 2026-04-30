import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength, Matches } from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'Mi Negocio' })
  @IsString()
  organizationName: string



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
