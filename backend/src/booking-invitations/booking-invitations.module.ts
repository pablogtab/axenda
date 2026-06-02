import { Module } from '@nestjs/common';
import { BookingInvitationsService } from './booking-invitations.service';
import { BookingInvitationsController } from './booking-invitations.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [BookingInvitationsController],
  providers: [BookingInvitationsService, PrismaService],
  exports: [BookingInvitationsService],
})
export class BookingInvitationsModule {}
