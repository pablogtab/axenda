import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private readonly pool: Pool

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL')

    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)

    super({ adapter })

    this.pool = pool

    this.logger.log('✅ PrismaService initialized with pg adapter')
  }

  private poolClosed = false

  async onModuleDestroy() {
    if (this.poolClosed) return
    this.poolClosed = true
    // Prisma 7 removed $disconnect(). Close the pg pool directly.
    await this.pool.end()
    this.logger.log('Database pool closed')
  }
}
