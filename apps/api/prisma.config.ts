import { defineConfig } from 'prisma/config'
import path from 'node:path'
import * as dotenv from 'dotenv'

// Carga el .env desde la raíz del workspace
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export default defineConfig({
  schema: path.join('prisma', 'schema'),

  migrate: {
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const connectionString = process.env['DATABASE_URL']
      if (!connectionString) {
        throw new Error('DATABASE_URL is not defined in environment variables')
      }
      return new PrismaPg({ connectionString })
    },
  },
})
