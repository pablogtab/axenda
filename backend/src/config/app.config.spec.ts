import { validateConfig } from './app.config'

describe('validateConfig', () => {
  const validBase = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5433/db',
    JWT_SECRET: 'supersecretkey',
    JWT_REFRESH_SECRET: 'superrefreshkey',
  }

  it('should return validated config when all required vars are present', () => {
    const result = validateConfig(validBase)
    expect(result).toBeDefined()
    expect(result.DATABASE_URL).toBe(validBase.DATABASE_URL)
    expect(result.JWT_SECRET).toBe(validBase.JWT_SECRET)
  })

  it('should apply defaults for optional vars', () => {
    const result = validateConfig(validBase)
    expect(result.PORT).toBe(3000)
    expect(result.NODE_ENV).toBe('development')
    expect(result.JWT_EXPIRES_IN).toBe('15m')
    expect(result.JWT_REFRESH_EXPIRES_IN).toBe('7d')
    expect(result.FRONTEND_URL).toBe('http://localhost:4200')
  })

  it('should throw when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _, ...withoutDb } = validBase
    expect(() => validateConfig(withoutDb)).toThrow('DATABASE_URL')
  })

  it('should throw when JWT_SECRET is missing', () => {
    const { JWT_SECRET: _, ...withoutJwt } = validBase
    expect(() => validateConfig(withoutJwt)).toThrow('JWT_SECRET')
  })

  it('should throw when JWT_REFRESH_SECRET is missing', () => {
    const { JWT_REFRESH_SECRET: _, ...withoutRefresh } = validBase
    expect(() => validateConfig(withoutRefresh)).toThrow('JWT_REFRESH_SECRET')
  })

  it('should throw listing all missing vars at once', () => {
    expect(() => validateConfig({})).toThrow(
      /DATABASE_URL.*JWT_SECRET.*JWT_REFRESH_SECRET|DATABASE_URL/,
    )
  })

  it('should override defaults when optional vars are provided', () => {
    const result = validateConfig({ ...validBase, PORT: '8080', NODE_ENV: 'production' })
    expect(result.PORT).toBe(8080)
    expect(result.NODE_ENV).toBe('production')
  })
})
