import { UserRole } from '@prisma/client'

/**
 * Interface representing the user currently authenticated in the request context.
 * This is independent of the authentication strategy used (JWT, Session, etc.).
 *
 * NOTE: `tenantId` is optional because SystemUsers (Backoffice SUPER_ADMIN)
 * do not belong to any tenant — they are stored in the `system_users` table.
 */
export interface AuthenticatedUser {
  sub: string        // userId (User.id or SystemUser.id)
  tenantId?: string  // undefined for SystemUser (backoffice admins)
  role: UserRole | 'SUPER_ADMIN'
}
