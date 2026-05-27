import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CustomFieldType } from '@prisma/client'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateClientFieldDefinitionDto {
  @ApiProperty({ example: '¿Recibe recordatorios?' })
  @IsString()
  name: string

  @ApiProperty({ enum: CustomFieldType, example: CustomFieldType.BOOLEAN })
  @IsEnum(CustomFieldType)
  type: CustomFieldType

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  listId?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean

  @ApiPropertyOptional({ example: 'true', nullable: true })
  @IsOptional()
  @IsString()
  defaultValue?: string
}

export class UpdateClientFieldDefinitionDto {
  @ApiPropertyOptional({ example: '¿Acepta promociones?' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ enum: CustomFieldType, example: CustomFieldType.SELECT })
  @IsOptional()
  @IsEnum(CustomFieldType)
  type?: CustomFieldType

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
  @IsOptional()
  @IsUUID()
  listId?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean

  @ApiPropertyOptional({ example: 'true', nullable: true })
  @IsOptional()
  @IsString()
  defaultValue?: string

  @ApiPropertyOptional({ example: 2, minimum: 0, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  order?: number
}

export class CreateClientFieldListDto {
  @ApiProperty({ example: 'Nivel de fidelidad' })
  @IsString()
  name: string
}

export class UpdateClientFieldListDto {
  @ApiProperty({ example: 'Nivel de membresía' })
  @IsString()
  name: string
}

export class CreateClientFieldListOptionDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  label: string
}

export class UpdateClientFieldListOptionDto {
  @ApiProperty({ example: 'Frecuente' })
  @IsString()
  label: string
}
