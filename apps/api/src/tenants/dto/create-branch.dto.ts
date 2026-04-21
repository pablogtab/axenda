import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class CreateBranchDto {
  @ApiProperty({ example: 'Sucursal Centro' })
  @IsString()
  name: string

  @ApiPropertyOptional({ example: 'Av. Corrientes 1234, CABA' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: '+54 11 4444-5555' })
  @IsOptional()
  @IsString()
  phone?: string
}
