import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateBranchDto {
  @ApiPropertyOptional({ example: 'Sucursal Norte' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ example: 'Av. Cabildo 2000, CABA' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: '+54 11 5555-6666' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean
}
