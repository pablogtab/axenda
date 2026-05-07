import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsTimeZone, Matches } from 'class-validator'
import { Type } from 'class-transformer'
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

  @ApiPropertyOptional({ example: '/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string

  @ApiPropertyOptional({ example: '/banner.png' })
  @IsOptional()
  @IsString()
  bannerUrl?: string

  @ApiPropertyOptional({ example: 'mi-negocio' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'El link solo puede contener letras minúsculas, números y guiones' })
  publicSlug?: string

  @ApiPropertyOptional({ example: 'BEAUTY' })
  @IsOptional()
  @IsString()
  category?: string

  @ApiPropertyOptional({ example: '+54 11 1234-5678' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: 'contacto@negocio.com' })
  @IsOptional()
  @IsString()
  email?: string

  @ApiPropertyOptional({ example: 'Av. Corrientes 1234' })
  @IsOptional()
  @IsString()
  address?: string

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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  publicShowBranchSelection?: boolean

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  publicShowProfessionalSelection?: boolean

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  publicMaxOverlapMins?: number

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  publicMaxBookingDays?: number

  @ApiPropertyOptional({ example: '1h' })
  @IsOptional()
  @IsString()
  publicMinBookingTime?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean
}
