import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Matches, MinLength } from 'class-validator'

export class CreateClientTagDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  @MinLength(2, { message: 'El nombre del tag debe tener al menos 2 caracteres' })
  name: string

  @ApiPropertyOptional({ example: '#FFD700' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe ser un código HEX válido (ej: #FFD700)' })
  color?: string
}
