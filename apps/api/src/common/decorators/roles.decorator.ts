import { SetMetadata } from '@nestjs/common'

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  RECEPTIONIST = 'RECEPTIONIST',
  PROFESSIONAL = 'PROFESSIONAL',
}

export const ROLES_KEY = 'roles'

/**
 * Restrict access to specific roles.
 * Usage: @Roles(UserRole.ADMIN, UserRole.MANAGER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
