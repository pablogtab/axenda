// Required for class-transformer and class-validator decorators
import 'reflect-metadata'

// Global test environment variables
process.env['NODE_ENV'] = 'test';
process.env['LOCAL_EMAIL'] = 'true';
process.env['WPP_SYNC_TEMPLATES'] = 'false'; // Evitar sync real en tests
process.env['SKIP_TURNSTILE'] = 'true'; // Saltar validación de Cloudflare en tests
