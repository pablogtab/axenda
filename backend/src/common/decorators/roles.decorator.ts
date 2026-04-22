import { SetMetadata } from '@nestjs/common'
import { UserRole } from '@prisma/client'

// Re-export so importers can get UserRole from either @prisma/client or here
export { UserRole }

export const ROLES_KEY = 'roles'

/**
 * Restrict access to specific roles.
 * Usage: @Roles(UserRole.ADMIN, UserRole.MANAGER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
