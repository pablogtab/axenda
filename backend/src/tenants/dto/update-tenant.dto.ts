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

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner.png' })
  @IsOptional()
  @IsString()
  bannerUrl?: string

  @ApiPropertyOptional({ example: 'mi-negocio' })
  @IsOptional()
  @IsString()
  publicSlug?: string

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsOptional()
  @IsString()
  primaryColor?: string

  @ApiPropertyOptional({ example: '#4f46e5' })
  @IsOptional()
  @IsString()
  primaryHoverColor?: string

  @ApiPropertyOptional({ example: '#a855f7' })
  @IsOptional()
  @IsString()
  accentColor?: string

  @ApiPropertyOptional({ example: '#0a0b14' })
  @IsOptional()
  @IsString()
  backgroundColor?: string

  @ApiPropertyOptional({ example: '#f8fafc' })
  @IsOptional()
  @IsString()
  textColor?: string
}
