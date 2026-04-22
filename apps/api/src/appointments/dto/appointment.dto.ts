import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AppointmentStatus } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateAppointmentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  clientId: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  professionalId: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  serviceId: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  branchId: string

  @ApiProperty({ example: '2026-05-15T14:30:00Z', description: 'Fecha y hora de inicio del turno en formato ISO' })
  @IsDateString()
  startTime: string

  @ApiPropertyOptional({ example: 'Llegaré 5 mins tarde.' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ example: 'Viene con un acompañante.' })
  @IsOptional()
  @IsString()
  internalNotes?: string
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.CONFIRMED })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus

  @ApiPropertyOptional({ example: 'Confirmado por teléfono.' })
  @IsOptional()
  @IsString()
  notes?: string
}
