const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: './prisma/schema',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
