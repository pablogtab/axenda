import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { UserRole } from '@prisma/client'

export class CreateUserDto {
  @ApiProperty({ example: 'María' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'González' })
  @IsString()
  lastName: string

  @ApiProperty({ example: 'maria@minegocio.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.RECEPTIONIST })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole
}
