import { HttpException, HttpStatus } from '@nestjs/common';

export class RefreshRequiredException extends HttpException {
  constructor() {
    super(
      {
        message: 'Token expired',
        errorCode: 'TOKEN_EXPIRED',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
