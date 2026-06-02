import { Test, TestingModule } from '@nestjs/testing';
import { BookingInvitationsService } from './booking-invitations.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BookingInvitationsService', () => {
  let service: BookingInvitationsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      bookingInvitation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingInvitationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<BookingInvitationsService>(BookingInvitationsService);
  });

  describe('create', () => {
    it('should create a booking invitation with a generated token', async () => {
      const dto = {
        description: 'VIP client',
        maxUses: 5,
        schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }],
      };
      prismaMock.bookingInvitation.create.mockResolvedValue({
        id: 'inv-123',
        token: 'inv_generated_token',
        ...dto,
      });

      const result = await service.create('tenant-123', dto);
      expect(result).toBeDefined();
      expect(prismaMock.bookingInvitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          token: expect.stringContaining('inv_'),
          description: 'VIP client',
          maxUses: 5,
        }),
      });
    });
  });

  describe('validateToken', () => {
    it('should throw BadRequestException if invitation not found', async () => {
      prismaMock.bookingInvitation.findUnique.mockResolvedValue(null);
      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        new BadRequestException('Este link de invitación no está disponible.')
      );
    });

    it('should throw BadRequestException if invitation is inactive', async () => {
      prismaMock.bookingInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        active: false,
        expiresAt: null,
        maxUses: null,
        usesCount: 0,
      });
      await expect(service.validateToken('token')).rejects.toThrow(
        new BadRequestException('Este link de invitación no está disponible.')
      );
    });

    it('should throw BadRequestException if invitation has expired', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10);
      prismaMock.bookingInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        active: true,
        expiresAt: pastDate,
        maxUses: null,
        usesCount: 0,
      });
      await expect(service.validateToken('token')).rejects.toThrow(
        new BadRequestException('Este link de invitación no está disponible.')
      );
    });

    it('should throw BadRequestException if max uses reached', async () => {
      prismaMock.bookingInvitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        active: true,
        expiresAt: null,
        maxUses: 3,
        usesCount: 3,
      });
      await expect(service.validateToken('token')).rejects.toThrow(
        new BadRequestException('Este link de invitación no está disponible.')
      );
    });

    it('should return invitation if all validations pass', async () => {
      const invitation = {
        id: 'inv-1',
        active: true,
        expiresAt: null,
        maxUses: 5,
        usesCount: 2,
        tenant: { id: 'tenant-123' },
      };
      prismaMock.bookingInvitation.findUnique.mockResolvedValue(invitation);

      const result = await service.validateToken('token');
      expect(result).toEqual(invitation);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if invitation not found or doesn\'t belong to tenant', async () => {
      prismaMock.bookingInvitation.findFirst.mockResolvedValue(null);
      await expect(service.delete('tenant-123', 'inv-1')).rejects.toThrow(
        new NotFoundException('Invitación no encontrada')
      );
    });

    it('should call delete on Prisma when found', async () => {
      prismaMock.bookingInvitation.findFirst.mockResolvedValue({ id: 'inv-1', tenantId: 'tenant-123' });
      prismaMock.bookingInvitation.delete.mockResolvedValue({ id: 'inv-1' });

      await service.delete('tenant-123', 'inv-1');
      expect(prismaMock.bookingInvitation.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });
  });
});
