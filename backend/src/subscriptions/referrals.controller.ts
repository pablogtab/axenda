import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('subscriptions/referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('validate')
  async validateCode(
    @CurrentUser('tenantId') tenantId: string,
    @Query('code') code: string,
    @Query('planCode') planCode?: string,
  ) {
    return this.referralsService.validateCode(code, tenantId, planCode);
  }

  @Get('my-code')
  async getMyCode(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.referralsService.getOrCreateUserCode(userId, tenantId);
  }

  @Put('my-code')
  async updateMyCode(
    @CurrentUser('sub') userId: string,
    @Body('code') code: string,
  ) {
    return this.referralsService.updateMyCode(userId, code);
  }
}
