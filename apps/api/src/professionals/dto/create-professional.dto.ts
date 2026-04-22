import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator'

export class CreateProfessionalDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  lastName: string

  @ApiPropertyOptional({ example: 'Especialista en colorimetría' })
  @IsOptional()
  @IsString()
  bio?: string

  @ApiPropertyOptional({ example: 'https://axenda.com/img/juan.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string

  @ApiPropertyOptional({ example: '#4CAF50' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe ser un código HEX válido (ej: #4CAF50)' })
  color?: string

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID of an existing User to link' })
  @IsOptional()
  @IsUUID()
  userId?: string
}
