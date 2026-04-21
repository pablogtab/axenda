/**
 * Payload stored inside the JWT access token.
 * Available via @CurrentUser() decorator in any authenticated route.
 */
export interface JwtPayload {
  sub: string        // userId
  email: string
  role: string       // UserRole
  tenantId: string
}
