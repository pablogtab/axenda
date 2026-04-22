import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator'

const mockContext = (userRole?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: userRole ? { role: userRole } : undefined }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new RolesGuard(reflector)
  })

  it('should allow access when no @Roles() decorator is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    const ctx = mockContext('ADMIN')
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('should allow access when @Roles() is empty array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([])
    const ctx = mockContext('ADMIN')
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('should allow access when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN])
    const ctx = mockContext(UserRole.ADMIN)
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('should allow access when user has one of multiple required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN, UserRole.MANAGER])
    const ctx = mockContext(UserRole.MANAGER)
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('should throw ForbiddenException when user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN])
    const ctx = mockContext(UserRole.RECEPTIONIST)
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })

  it('should throw ForbiddenException when user is not authenticated', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN])
    const ctx = mockContext(undefined) // no user
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })

  it('should use the ROLES_KEY metadata key', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined)
    guard.canActivate(mockContext('ADMIN'))
    expect(spy).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array))
  })
})
