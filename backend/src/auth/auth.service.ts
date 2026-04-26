import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'
import { UserRole } from '@prisma/client'

const BCRYPT_ROUNDS = process.env['NODE_ENV'] === 'test' ? 1 : 12

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.organizationSlug },
    })
    if (existing) {
      throw new ConflictException(`El slug "${dto.organizationSlug}" ya está en uso`)
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.organizationName, slug: dto.organizationSlug },
      })

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          role: UserRole.ADMIN,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      })

      return { tenant, user }
    })

    return this.generateTokens(user.id, tenant.id, user.role)
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    let user: Awaited<ReturnType<typeof this.findUser>> | null

    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug },
      })
      if (!tenant) throw new UnauthorizedException('Credenciales inválidas')

      user = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
      })
    } else {
      user = await this.prisma.user.findFirst({
        where: { email: dto.email, active: true },
      })
    }

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isValid) throw new UnauthorizedException('Credenciales inválidas')

    return this.generateTokens(user.id, user.tenantId, user.role)
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(userId: string, tenantId: string, role: UserRole, oldToken: string) {
    // Rotate: delete old token, issue new pair
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: oldToken },
    })
    return this.generateTokens(userId, tenantId, role)
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    })
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async findUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  private async generateTokens(userId: string, tenantId: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, tenantId, role }

    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, jti: crypto.randomUUID() }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.jwtService.signAsync({ ...payload, jti: crypto.randomUUID() } as any, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      } as any),
    ])

    // Calculate expirations for the client
    const accessTokenExpiresIn = this.config.get<string>('JWT_EXPIRES_IN', '15m')
    const expiresAt = this.parseExpiry(accessTokenExpiresIn)
    
    const refreshExpiresAt = this.parseExpiry(refreshExpiresIn)

    // Persist refresh token (used for revocation)
    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt: refreshExpiresAt },
    })

    return { 
      accessToken, 
      refreshToken, 
      expiresAt: expiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString()
    }
  }

  /** Parses a string like "7d", "24h", "60m" into a future Date */
  private parseExpiry(expiry: string): Date {
    const units: Record<string, number> = {
      d: 86_400_000,
      h: 3_600_000,
      m: 60_000,
      s: 1_000,
    }
    const match = expiry.match(/^(\d+)([dhms])$/)
    const ms = match ? parseInt(match[1], 10) * (units[match[2]] ?? 0) : 7 * 86_400_000
    return new Date(Date.now() + ms)
  }
}
