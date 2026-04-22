import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateCategoryDto {
  @ApiProperty({ example: 'Cortes Clásicos' })
  @IsString()
  name: string
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Cortes Clásicos' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean
}
