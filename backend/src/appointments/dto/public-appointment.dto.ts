import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator'
import { UpsertAppointmentCustomFieldValueDto } from './appointment.dto'

export class CreatePublicAppointmentDto {
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

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  clientName: string

  @ApiProperty({ example: 'juan@email.com' })
  @IsEmail()
  clientEmail: string

  @ApiProperty({ example: '+5493512345678' })
  @IsString()
  @IsNotEmpty()
  clientPhone: string

  @ApiPropertyOptional({ example: 'Llegaré 5 mins tarde.' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ example: 'inv_abc123', description: 'Token de invitación para reservar' })
  @IsOptional()
  @IsString()
  invitationToken?: string

  @ApiPropertyOptional({ type: [UpsertAppointmentCustomFieldValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertAppointmentCustomFieldValueDto)
  customFields?: UpsertAppointmentCustomFieldValueDto[]
}
