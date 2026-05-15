import { UserRole } from '@prisma/client'

/**
 * Interface representing the user currently authenticated in the request context.
 * This is independent of the authentication strategy used (JWT, Session, etc.).
 */
export interface AuthenticatedUser {
  sub: string        // userId
  tenantId: string
  role: UserRole
}
