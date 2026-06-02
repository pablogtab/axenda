import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Min, IsArray, ValidateIf } from 'class-validator'

export class CreateServiceDto {
  @ApiProperty({ example: 'Corte con Tijera' })
  @IsString()
  name: string

  @ApiPropertyOptional({ example: 'Corte tradicional realizado íntegramente con tijera.' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: 45, description: 'Duración del servicio en minutos' })
  @IsInt()
  @Min(5, { message: 'La duración mínima es de 5 minutos' })
  duration: number

  @ApiPropertyOptional({ example: 15000.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number

  @ApiPropertyOptional({ example: '#4CAF50' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe ser un código HEX válido (ej: #4CAF50)' })
  color?: string

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de la categoría. Enviar null para quitar la categoría.' })
  @IsOptional()
  @ValidateIf((o) => o.categoryId !== null)
  @IsUUID()
  categoryId?: string | null

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBookablePublic?: boolean

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showPrice?: boolean

  @ApiPropertyOptional({ example: 'Consultar' })
  @IsOptional()
  @IsString()
  customPriceLabel?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showDuration?: boolean

  @ApiPropertyOptional({ example: 'Asistir con el cabello lavado sin laca' })
  @IsOptional()
  @IsString()
  indications?: string

  @ApiPropertyOptional({ example: ['Lavado premium', 'Asesoramiento', 'Secado'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includes?: string[]

  @ApiPropertyOptional({ example: 'srv_img_123456.jpg' })
  @IsOptional()
  @IsString()
  mainImageKey?: string

  @ApiPropertyOptional({ example: ['srv_img_123.jpg', 'srv_img_456.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryKeys?: string[]
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Corte con Tijera' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ example: 'Corte tradicional realizado íntegramente con tijera.' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ example: 45, description: 'Duración del servicio en minutos' })
  @IsOptional()
  @IsInt()
  @Min(5, { message: 'La duración mínima es de 5 minutos' })
  duration?: number

  @ApiPropertyOptional({ example: 15000.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number

  @ApiPropertyOptional({ example: '#4CAF50' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe ser un código HEX válido (ej: #4CAF50)' })
  color?: string

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de la categoría. Enviar null para quitar la categoría.' })
  @IsOptional()
  @ValidateIf((o) => o.categoryId !== null)
  @IsUUID()
  categoryId?: string | null

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBookablePublic?: boolean

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showPrice?: boolean

  @ApiPropertyOptional({ example: 'Consultar' })
  @IsOptional()
  @IsString()
  customPriceLabel?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showDuration?: boolean

  @ApiPropertyOptional({ example: 'Asistir con el cabello lavado sin laca' })
  @IsOptional()
  @IsString()
  indications?: string

  @ApiPropertyOptional({ example: ['Lavado premium', 'Asesoramiento', 'Secado'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includes?: string[]

  @ApiPropertyOptional({ example: 'srv_img_123456.jpg' })
  @IsOptional()
  @IsString()
  mainImageKey?: string

  @ApiPropertyOptional({ example: ['srv_img_123.jpg', 'srv_img_456.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryKeys?: string[]
}
