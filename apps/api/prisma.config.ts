import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'
import { resolve } from 'node:path'

// Prisma CLI commands run from apps/api/, so ../../.env resolves to workspace root.
// datasource.url here is only for Prisma Migrate (CLI operations).
// At runtime, PrismaClient uses @prisma/adapter-pg (configured in NestJS PrismaService).
config({ path: resolve('../../.env') })

export default defineConfig({
  schema: './prisma/schema',
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
