import { IsString, IsOptional, IsDateString, IsArray, IsInt, Min, Max, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class BookingInvitationScheduleDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @IsString()
  startTime: string; // Formato "HH:MM"

  @IsString()
  endTime: string; // Formato "HH:MM"
}

export class CreateBookingInvitationDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingInvitationScheduleDto)
  schedule: BookingInvitationScheduleDto[];

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}
