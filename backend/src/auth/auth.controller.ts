import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterStartDto, RegisterCompleteDto } from './dto/register-flow.dto'
import { LoginDto } from './dto/login.dto'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-start')
  @ApiOperation({ summary: 'Iniciar registro (envía código al mail)' })
  registerStart(@Body() dto: RegisterStartDto) {
    return this.authService.registerStart(dto)
  }

  @Post('register-complete')
  @ApiOperation({ summary: 'Completar registro (verifica código y crea cuenta)' })
  registerComplete(@Body() dto: RegisterCompleteDto) {
    return this.authService.registerComplete(dto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  refresh(
    @CurrentUser()
    user: { sub: string; tenantId: string; role: UserRole; refreshToken: string },
  ) {
    return this.authService.refresh(user.sub, user.tenantId, user.role, user.refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión e invalidar refresh token' })
  async logout(
    @CurrentUser()
    user: { sub: string; refreshToken: string },
  ) {
    await this.authService.logout(user.sub, user.refreshToken)
  }
}
