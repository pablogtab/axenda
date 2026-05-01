import { Injectable, ForbiddenException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name)
  private readonly secretKey: string
  private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

  constructor(private config: ConfigService) {
    this.secretKey = this.config.getOrThrow<string>('CLOUDFLARE_TURNSTILE_SECRET')
  }

  async verifyToken(token: string, remoteIp?: string): Promise<boolean> {
    const skip = this.config.get<string>('SKIP_TURNSTILE') === 'true'
    if (skip) return true

    try {
      const body = `secret=${encodeURIComponent(this.secretKey)}&response=${encodeURIComponent(token)}${
        remoteIp ? `&remoteip=${encodeURIComponent(remoteIp)}` : ''
      }`;

      const response = await axios.post(this.verifyUrl, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { success, 'error-codes': errorCodes } = response.data

      if (!success) {
        this.logger.warn(`Turnstile validation failed: ${JSON.stringify(errorCodes)}`)
        throw new ForbiddenException('Validación de seguridad fallida (Turnstile).')
      }

      return true
    } catch (error) {
      if (error instanceof ForbiddenException) throw error
      
      this.logger.error('Error connecting to Cloudflare Turnstile API', error)
      throw new ForbiddenException('Error al validar seguridad. Reintente.')
    }
  }
}
