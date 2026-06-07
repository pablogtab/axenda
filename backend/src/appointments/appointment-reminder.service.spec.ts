import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentReminderService } from './appointment-reminder.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

describe('AppointmentReminderService', () => {
  let service: AppointmentReminderService;
  let prismaMock: any;
  let whatsappMock: any;

  beforeEach(async () => {
    prismaMock = {
      appointment: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    whatsappMock = {
      sendTemplateMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentReminderService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: WhatsappService,
          useValue: whatsappMock,
        },
      ],
    }).compile();

    service = module.get<AppointmentReminderService>(AppointmentReminderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should do nothing if no appointments are found', async () => {
    prismaMock.appointment.findMany.mockResolvedValue([]);

    await service.handleSendReminders();

    expect(prismaMock.appointment.findMany).toHaveBeenCalled();
    expect(whatsappMock.sendTemplateMessage).not.toHaveBeenCalled();
    expect(prismaMock.appointment.update).not.toHaveBeenCalled();
  });

  it('should send axenda_booking_reminder and mark as sent if appointment is booked >= 1 day in advance and allowReschedule is true', async () => {
    const now = new Date('2026-06-07T12:00:00Z');
    // Start time: 10 hours from now (within 12h window)
    const startTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    // Created: 4 days ago
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-1',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      cancelToken: 'cancel-token-1',
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: true, address: 'Centro 123', timezone: 'UTC' },
      professional: { firstName: 'Leo', lastName: 'Messi' },
      service: { name: 'Corte de Pelo' },
      branch: { address: 'Sede Centro' },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});
    whatsappMock.sendTemplateMessage.mockResolvedValue({});

    await service.handleSendReminders(now);

    // Verify WhatsApp template message was sent
    expect(whatsappMock.sendTemplateMessage).toHaveBeenCalledWith(
      'tenant-1',
      '5493511234567',
      'axenda_booking_reminder',
      expect.objectContaining({
        clientName: 'Juan',
        businessName: 'Barberia',
        serviceName: 'Corte de Pelo',
        branchAddress: 'Sede Centro',
        professionalName: 'Leo Messi',
        appointmentId: 'cancel-token-1',
      })
    );

    // Verify appointment was updated in the DB
    expect(prismaMock.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-1' },
      data: { whatsappReminderSent: true },
    });
  });

  it('should send axenda_booking_reminder_no_cancel if allowReschedule is false', async () => {
    const now = new Date('2026-06-07T12:00:00Z');
    const startTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-2',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      cancelToken: 'cancel-token-2',
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: false, address: 'Centro 123', timezone: 'UTC' },
      professional: { firstName: 'Leo', lastName: '' },
      service: { name: 'Corte de Pelo' },
      branch: null,
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});
    whatsappMock.sendTemplateMessage.mockResolvedValue({});

    await service.handleSendReminders(now);

    expect(whatsappMock.sendTemplateMessage).toHaveBeenCalledWith(
      'tenant-1',
      '5493511234567',
      'axenda_booking_reminder_no_cancel',
      expect.objectContaining({
        clientName: 'Juan',
        businessName: 'Barberia',
        branchAddress: 'Centro 123', // Falls back to tenant address
      })
    );

    expect(prismaMock.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-2' },
      data: { whatsappReminderSent: true },
    });
  });

  it('should skip sending reminder but mark as sent if appointment is booked < 1 day in advance', async () => {
    const now = new Date('2026-06-07T12:00:00Z');
    // Start time: 10 hours from now
    const startTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    // Created: 2 hours ago (less than 1 day difference)
    const createdAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-3',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: true, timezone: 'UTC' },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});

    await service.handleSendReminders(now);

    // Verification: WhatsApp was NOT sent, but DB state is updated
    expect(whatsappMock.sendTemplateMessage).not.toHaveBeenCalled();
    expect(prismaMock.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-3' },
      data: { whatsappReminderSent: true },
    });
  });

  it('should skip sending reminder but mark as sent if client phone is missing', async () => {
    const now = new Date('2026-06-07T12:00:00Z');
    const startTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-4',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      client: { firstName: 'Juan', phone: null },
      tenant: { name: 'Barberia', allowReschedule: true, timezone: 'UTC' },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});

    await service.handleSendReminders(now);

    expect(whatsappMock.sendTemplateMessage).not.toHaveBeenCalled();
    expect(prismaMock.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-4' },
      data: { whatsappReminderSent: true },
    });
  });

  it('should mark as sent even if whatsapp service throws an exception', async () => {
    const now = new Date('2026-06-07T12:00:00Z');
    const startTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-5',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: true, timezone: 'UTC' },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});
    whatsappMock.sendTemplateMessage.mockRejectedValue(new Error('Meta API Down'));

    await service.handleSendReminders(now);

    expect(whatsappMock.sendTemplateMessage).toHaveBeenCalled();
    expect(prismaMock.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-5' },
      data: { whatsappReminderSent: true },
    });
  });

  it('should skip sending reminder and NOT mark as sent if it is quiet hours', async () => {
    const now = new Date('2026-06-07T23:00:00Z'); // 23:00 / 11:00 PM (quiet hours)
    const startTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-6',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: true, timezone: 'UTC' },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});

    await service.handleSendReminders(now);

    expect(whatsappMock.sendTemplateMessage).not.toHaveBeenCalled();
    expect(prismaMock.appointment.update).not.toHaveBeenCalled();
  });

  it('should handle quiet hours correctly in America/Argentina/Buenos_Aires timezone', async () => {
    // 01:00 AM UTC on June 8th is 10:00 PM (22:00) on June 7th in Argentina (UTC-3)
    const now = new Date('2026-06-08T01:00:00Z');
    const startTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-7',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: true, timezone: 'America/Argentina/Buenos_Aires' },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});

    await service.handleSendReminders(now);

    expect(whatsappMock.sendTemplateMessage).not.toHaveBeenCalled();
    expect(prismaMock.appointment.update).not.toHaveBeenCalled();
  });
});
