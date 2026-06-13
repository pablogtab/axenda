import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CustomFieldType, CustomFieldEntity } from '@prisma/client'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateCustomFieldDefinitionDto {
  @ApiProperty({ example: '¿Recibe recordatorios?' })
  @IsString()
  name: string

  @ApiProperty({ enum: CustomFieldType, example: CustomFieldType.BOOLEAN })
  @IsEnum(CustomFieldType)
  type: CustomFieldType

  @ApiPropertyOptional({ enum: CustomFieldEntity, example: CustomFieldEntity.CLIENT })
  @IsOptional()
  @IsEnum(CustomFieldEntity)
  entityType?: CustomFieldEntity

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  listId?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showInPublicView?: boolean

  @ApiPropertyOptional({ example: 'true', nullable: true })
  @IsOptional()
  @IsString()
  defaultValue?: string
}

export class UpdateCustomFieldDefinitionDto {
  @ApiPropertyOptional({ example: '¿Acepta promociones?' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ enum: CustomFieldType, example: CustomFieldType.SELECT })
  @IsOptional()
  @IsEnum(CustomFieldType)
  type?: CustomFieldType

  @ApiPropertyOptional({ enum: CustomFieldEntity, example: CustomFieldEntity.CLIENT })
  @IsOptional()
  @IsEnum(CustomFieldEntity)
  entityType?: CustomFieldEntity

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
  @IsOptional()
  @IsUUID()
  listId?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showInPublicView?: boolean

  @ApiPropertyOptional({ example: 'true', nullable: true })
  @IsOptional()
  @IsString()
  defaultValue?: string

  @ApiPropertyOptional({ example: 2, minimum: 0, maximum: 9 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9)
  order?: number
}

export class CreateCustomFieldListDto {
  @ApiProperty({ example: 'Nivel de fidelidad' })
  @IsString()
  name: string
}

export class UpdateCustomFieldListDto {
  @ApiProperty({ example: 'Nivel de membresía' })
  @IsString()
  name: string
}

export class CreateCustomFieldListOptionDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  label: string
}

export class UpdateCustomFieldListOptionDto {
  @ApiProperty({ example: 'Frecuente' })
  @IsString()
  label: string
}
