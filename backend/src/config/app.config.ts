import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator'
import { plainToInstance } from 'class-transformer'

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string

  @IsString()
  JWT_SECRET: string

  @IsString()
  JWT_REFRESH_SECRET: string

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN: string = '15m'

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d'

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000

  @IsOptional()
  @IsString()
  NODE_ENV: string = 'development'

  @IsOptional()
  @IsString()
  FRONTEND_URL: string = 'http://localhost:4200'
}

export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })

  // Manual validation (lightweight, no extra deps)
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
  const missing = required.filter((key) => !config[key])

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missing.join(', ')}\n` +
        `   Check your .env file.`,
    )
  }

  return validatedConfig
}
