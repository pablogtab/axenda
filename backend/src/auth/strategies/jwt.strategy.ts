import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    })
  }

  async validate(payload: AuthenticatedUser) {
    // 1. Primero intentar como SystemUser (Backoffice SUPER_ADMIN)
    //    Los tokens de SystemUser tienen role='SUPER_ADMIN' y no tienen tenantId
    if (payload.role === 'SUPER_ADMIN' && !payload.tenantId) {
      const systemUser = await this.prisma.systemUser.findUnique({
        where: { id: payload.sub },
        select: { id: true, active: true },
      })

      if (!systemUser || !systemUser.active) {
        throw new UnauthorizedException('Token inválido o administrador inactivo')
      }

      return {
        sub: systemUser.id,
        role: 'SUPER_ADMIN' as const,
        tenantId: undefined,
      }
    }

    // 2. Usuarios de tenant regulares (ADMIN, MANAGER, RECEPTIONIST, PROFESSIONAL)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tenantId: true, email: true, role: true, active: true },
    })

    if (!user || !user.active) {
      throw new UnauthorizedException('Token inválido o usuario inactivo')
    }

    // Attach fresh values from DB onto the JWT payload structure
    return {
      ...payload,
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    }
  }
}
