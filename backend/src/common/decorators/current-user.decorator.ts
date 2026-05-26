import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Extracts the authenticated user from the request.
 * Throws UnauthorizedException if the user is not found (guard missing).
 * 
 * Usage: 
 * @CurrentUser() user: AuthenticatedUser
 * @CurrentUser('sub') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado en el contexto de la petición. ¿Olvidaste el JwtAuthGuard?');
    }

    return data ? user[data] : user;
  },
);
