import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePackCheckoutDto {
  @ApiProperty({ example: 'WPP_PACK_100', enum: ['WPP_PACK_100', 'WPP_PACK_500', 'WPP_PACK_1000'] })
  @IsEnum(['WPP_PACK_100', 'WPP_PACK_500', 'WPP_PACK_1000'])
  packCode: 'WPP_PACK_100' | 'WPP_PACK_500' | 'WPP_PACK_1000';
}
