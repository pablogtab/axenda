import { defineConfig } from 'prisma/config'

console.log('--- DIAGNÓSTICO PRISMA ---');
console.log('DATABASE_URL en el entorno:', process.env.DATABASE_URL ? 'DEFINIDA' : 'VACÍA');
console.log('---------------------------');

export default defineConfig({
  schema: './prisma/schema',
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
