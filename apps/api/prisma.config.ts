import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'
import { resolve } from 'node:path'

// Prisma CLI commands run from apps/api/, so ../../.env resolves to workspace root.
// override: true ensures dotenv strips quotes from values, even if Prisma's own
// env injection has already set them with surrounding quotes included.
config({ path: resolve('../../.env'), override: true })

export default defineConfig({
  schema: './prisma/schema',
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
