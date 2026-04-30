import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class UtcLogger extends ConsoleLogger {
  protected getTimestamp(): string {
    return new Date().toISOString();
  }
}
