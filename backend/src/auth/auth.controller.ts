import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Ip,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterStartDto, RegisterCompleteDto } from './dto/register-flow.dto'
import { LoginDto } from './dto/login.dto'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole } from '@prisma/client'

import { TurnstileService } from './turnstile.service'

import { GoogleLoginDto } from './dto/google-login.dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly turnstileService: TurnstileService,
  ) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con Google' })
  async googleLogin(@Body() dto: GoogleLoginDto, @Ip() ip: string) {
    if (dto.turnstileToken) {
      await this.turnstileService.verifyToken(dto.turnstileToken, ip)
    }
    return this.authService.googleLogin(dto.idToken)
  }

  @Post('register-start')
  @ApiOperation({ summary: 'Iniciar registro (envía código al mail)' })
  async registerStart(@Body() dto: RegisterStartDto, @Ip() ip: string) {
    await this.turnstileService.verifyToken(dto.turnstileToken, ip)
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
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    await this.turnstileService.verifyToken(dto.turnstileToken, ip)
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
