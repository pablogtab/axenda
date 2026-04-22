import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, Min, ValidateIf } from 'class-validator'
import { ExceptionType } from '@prisma/client'

// Expresión regular para validar formato "HH:mm"
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export class CreateAvailabilityDto {
  @ApiProperty({ example: 1, description: 'Day of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number

  @ApiProperty({ example: '09:00', description: 'Start time in HH:mm format' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm (ej: 09:00)' })
  startTime: string

  @ApiProperty({ example: '18:00', description: 'End time in HH:mm format' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm (ej: 18:00)' })
  endTime: string

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Opcional, si la disponibilidad aplica a una sucursal específica' })
  @IsOptional()
  @IsUUID()
  branchId?: string
}

export class CreateExceptionDto {
  @ApiProperty({ enum: ExceptionType, example: ExceptionType.HOLIDAY })
  @IsEnum(ExceptionType)
  type: ExceptionType

  @ApiProperty({ example: '2026-12-25', description: 'Día de inicio de la excepción en formato ISO' })
  @IsISO8601()
  date: string

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Opcional: Día de fin si es un rango' })
  @IsOptional()
  @IsISO8601()
  endDate?: string

  @ApiPropertyOptional({ example: '09:00', description: 'Opcional: Si es nulo, aplica todo el día. Debe ser formato HH:mm' })
  @ValidateIf((o) => o.startTime !== undefined && o.startTime !== null)
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm (ej: 09:00)' })
  startTime?: string

  @ApiPropertyOptional({ example: '18:00', description: 'Opcional: Si es nulo, aplica todo el día. Debe ser formato HH:mm' })
  @ValidateIf((o) => o.endTime !== undefined && o.endTime !== null)
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm (ej: 18:00)' })
  endTime?: string

  @ApiPropertyOptional({ example: 'Vacaciones de invierno' })
  @IsOptional()
  @IsString()
  reason?: string
}
