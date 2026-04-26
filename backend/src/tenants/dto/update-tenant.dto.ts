import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, IsTimeZone } from 'class-validator'
import { TenantMode } from '@prisma/client'

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Mi Negocio Actualizado' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ enum: TenantMode })
  @IsOptional()
  @IsEnum(TenantMode)
  mode?: TenantMode

  @ApiPropertyOptional({ example: 'America/Argentina/Buenos_Aires' })
  @IsOptional()
  @IsTimeZone()
  timezone?: string

  @ApiPropertyOptional({ example: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string

  @ApiPropertyOptional({ example: 'mi-negocio' })
  @IsOptional()
  @IsString()
  publicSlug?: string
}
