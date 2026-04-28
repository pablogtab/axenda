import { Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RefreshRequiredException } from '../../common/exceptions/refresh-required.exception'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (info?.name === 'TokenExpiredError') {
      throw new RefreshRequiredException()
    }

    if (err || !user) {
      throw err || new UnauthorizedException('No autorizado')
    }

    return user
  }
}
