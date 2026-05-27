import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator'

export class CreateClientDto {
  @ApiProperty({ example: 'Lionel' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Messi' })
  @IsString()
  lastName: string

  @ApiPropertyOptional({ example: 'lionel@ejemplo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email?: string

  @ApiPropertyOptional({ example: '+549112345678' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: '30123456' })
  @IsOptional()
  @IsString()
  document?: string

  @ApiPropertyOptional({ example: 'Cliente frecuente, no le gusta esperar' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ example: 'https://axenda.com/img/lionel.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean
}

export class UpdateClientDto {
  @ApiPropertyOptional({ example: 'Lionel' })
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional({ example: 'Messi' })
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional({ example: 'lionel@ejemplo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El formato del email es inválido' })
  email?: string

  @ApiPropertyOptional({ example: '+549112345678' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: '30123456' })
  @IsOptional()
  @IsString()
  document?: string

  @ApiPropertyOptional({ example: 'Cliente frecuente, no le gusta esperar' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ example: 'https://axenda.com/img/lionel.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean
}

export class UpsertClientCustomFieldValueDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  fieldId: string

  @ApiPropertyOptional({ example: 'true', nullable: true })
  @IsOptional()
  @IsString()
  value?: string
}

export class SaveClientCustomFieldsDto {
  @ApiProperty({ type: [UpsertClientCustomFieldValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertClientCustomFieldValueDto)
  values: UpsertClientCustomFieldValueDto[]
}
