import { IsString, IsOptional, IsBoolean, IsObject, IsEnum, IsArray } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TenantMode } from '@prisma/client'

export class OnboardingMetadataDto {
  @ApiProperty()
  @IsString()
  plan: string

  @ApiProperty()
  @IsBoolean()
  loadDefaults: boolean

  @ApiProperty()
  @IsObject()
  setup: {
    volume: number
    teamSize: number
    whatsapp: boolean
    payments: boolean
  }
}

export class OnboardingDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsOptional()
  @IsString()
  logoUrl?: string

  @ApiProperty({ enum: TenantMode })
  @IsEnum(TenantMode)
  mode: TenantMode

  @ApiProperty()
  @IsBoolean()
  onboardingCompleted: boolean

  @ApiProperty()
  @IsString()
  branchName: string

  @ApiProperty()
  @IsOptional()
  @IsString()
  branchAddress?: string

  @ApiProperty()
  @IsString()
  professionalFirstName: string

  @ApiProperty()
  @IsString()
  professionalLastName: string

  @ApiProperty()
  @IsArray()
  @IsOptional()
  availability?: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]

  @ApiProperty()
  @IsObject()
  metadata: OnboardingMetadataDto
}
