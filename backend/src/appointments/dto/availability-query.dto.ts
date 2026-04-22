import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator'

export class GetAvailabilityDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  professionalId: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Para calcular cuántos bloques de tiempo requiere' })
  @IsUUID()
  serviceId: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  branchId: string

  @ApiProperty({ example: '2026-05-15', description: 'Día a consultar (YYYY-MM-DD)' })
  @IsDateString()
  date: string

  @ApiPropertyOptional({ example: 45, description: 'Duración en minutos (sobrescribe la duración del servicio o permite turnos genéricos)' })
  @IsOptional()
  @IsInt()
  @Min(5)
  duration?: number
}
