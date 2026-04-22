import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'María' })
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional({ example: 'González' })
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional({ example: 'NewPassword123!', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string
}
