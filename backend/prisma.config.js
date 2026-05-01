const { defineConfig } = require('prisma/config');

if (!process.env.DATABASE_URL) require('dotenv').config();

module.exports = defineConfig({
  schema: './prisma/schema',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});
