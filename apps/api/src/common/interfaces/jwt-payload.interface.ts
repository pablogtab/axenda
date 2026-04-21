import { UserRole } from '@prisma/client'

/**
 * Payload stored inside the JWT access token.
 * Available via @CurrentUser() decorator in any authenticated route.
 */
export interface JwtPayload {
  sub: string        // userId
  tenantId: string
  role: UserRole
}
