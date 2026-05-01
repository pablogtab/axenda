import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterStartDto, RegisterCompleteDto } from './dto/register-flow.dto'
import { LoginDto } from './dto/login.dto'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'
import { UserRole, AuthProvider } from '@prisma/client'
import { MailService } from '../mail/mail.service'
import * as crypto from 'crypto'

const BCRYPT_ROUNDS = process.env['NODE_ENV'] === 'test' ? 1 : 12

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  // ─── Register Flow ───────────────────────────────────────────────────────────

  async registerStart(dto: RegisterStartDto) {
    // 1. Verificar si el mail ya está en uso por un usuario activo
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, active: true },
    })
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado.')
    }

    // 2. Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

    // 3. Guardar en verification_codes (upsert para el mismo mail)
    await this.prisma.verificationCode.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        code,
        payload: { organizationName: dto.organizationName },
        expiresAt,
      },
      update: {
        code,
        payload: { organizationName: dto.organizationName },
        expiresAt,
      },
    })

    // 4. Enviar mail
    await this.mailService.sendMail({
      to: dto.email,
      subject: 'Código de verificación - Axenda',
      template: 'verification-code',
      context: {
        code,
        year: new Date().getFullYear(),
      },
    })

    return { message: 'Código de verificación enviado al correo.' }
  }

  async registerComplete(dto: RegisterCompleteDto) {
    // 1. Verificar código
    const verification = await this.prisma.verificationCode.findUnique({
      where: { email: dto.email },
    })

    if (!verification || verification.code !== dto.code || verification.expiresAt < new Date()) {
      throw new UnauthorizedException('Código de verificación inválido o expirado.')
    }

    const payload = verification.payload as { organizationName: string }

    // 2. Generar slug único
    const slug = await this.generateUniqueSlug()

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: payload.organizationName, slug },
      })

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          role: UserRole.ADMIN,
          firstName: dto.firstName,
          lastName: dto.lastName,
          identities: {
            create: {
              provider: AuthProvider.EMAIL,
              providerId: dto.email,
              passwordHash,
            },
          },
        },
      })

      return { tenant, user }
    })

    // 3. Borrar código usado
    await this.prisma.verificationCode.delete({ where: { email: dto.email } })

    // 4. Enviar mail de bienvenida (no bloqueante)
    this.mailService.sendMail({
      to: user.email,
      subject: '¡Bienvenido a Axenda!',
      template: 'welcome-new-account',
      context: {
        ownerName: user.firstName,
        businessName: tenant.name,
        dashboardLink: `${this.config.get('FRONTEND_URL')}/dashboard`,
        year: new Date().getFullYear(),
      },
    }).catch(err => console.error('Error enviando mail de bienvenida:', err))

    return this.generateTokens(user.id, tenant.id, user.role)
  }

  private async generateUniqueSlug(): Promise<string> {
    let slug = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      slug = crypto.randomBytes(3).toString('hex')
      const existing = await this.prisma.tenant.findUnique({ where: { slug } })
      if (!existing) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      throw new ConflictException('No se pudo generar un identificador único para el negocio.')
    }
    return slug
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    let user: any | null

    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug },
      })
      if (!tenant) throw new UnauthorizedException('Credenciales inválidas')

      user = await this.prisma.user.findFirst({
        where: { 
          tenantId: tenant.id, 
          email: dto.email,
          active: true,
        },
        include: {
          identities: {
            where: { provider: AuthProvider.EMAIL }
          }
        }
      })
    } else {
      user = await this.prisma.user.findFirst({
        where: { 
          email: dto.email, 
          active: true,
        },
        include: {
          identities: {
            where: { provider: AuthProvider.EMAIL }
          }
        }
      })
    }

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const emailIdentity = user.identities.find(i => i.provider === AuthProvider.EMAIL)
    if (!emailIdentity || !emailIdentity.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const isValid = await bcrypt.compare(dto.password, emailIdentity.passwordHash)
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
    return this.prisma.user.findUnique({ 
      where: { id },
      include: { identities: true }
    })
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
