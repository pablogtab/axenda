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

  it('should send axenda_booking_reminder_no_cancel and mark as sent if appointment is booked >= 3 days in advance and allowReschedule is true (temporarily forced no_cancel)', async () => {
    const now = new Date();
    // Start time: 23 hours from now
    const startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    // Created: 4 days ago
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-1',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      cancelToken: 'cancel-token-1',
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: true, address: 'Centro 123' },
      professional: { firstName: 'Leo', lastName: 'Messi' },
      service: { name: 'Corte de Pelo' },
      branch: { address: 'Sede Centro' },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});
    whatsappMock.sendTemplateMessage.mockResolvedValue({});

    await service.handleSendReminders();

    // Verify WhatsApp template message was sent
    expect(whatsappMock.sendTemplateMessage).toHaveBeenCalledWith(
      'tenant-1',
      '5493511234567',
      'axenda_booking_reminder_no_cancel',
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
    const now = new Date();
    const startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-2',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      cancelToken: 'cancel-token-2',
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: false, address: 'Centro 123' },
      professional: { firstName: 'Leo', lastName: '' },
      service: { name: 'Corte de Pelo' },
      branch: null,
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});
    whatsappMock.sendTemplateMessage.mockResolvedValue({});

    await service.handleSendReminders();

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

  it('should skip sending reminder but mark as sent if appointment is booked < 3 days in advance', async () => {
    const now = new Date();
    // Start time: 23 hours from now
    const startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    // Created: 1 day ago (less than 3 days)
    const createdAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-3',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: true },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});

    await service.handleSendReminders();

    // Verification: WhatsApp was NOT sent, but DB state is updated
    expect(whatsappMock.sendTemplateMessage).not.toHaveBeenCalled();
    expect(prismaMock.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-3' },
      data: { whatsappReminderSent: true },
    });
  });

  it('should skip sending reminder but mark as sent if client phone is missing', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-4',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      client: { firstName: 'Juan', phone: null },
      tenant: { name: 'Barberia', allowReschedule: true },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});

    await service.handleSendReminders();

    expect(whatsappMock.sendTemplateMessage).not.toHaveBeenCalled();
    expect(prismaMock.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-4' },
      data: { whatsappReminderSent: true },
    });
  });

  it('should mark as sent even if whatsapp service throws an exception', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const createdAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const mockAppointment = {
      id: 'appt-5',
      tenantId: 'tenant-1',
      startTime,
      createdAt,
      client: { firstName: 'Juan', phone: '5493511234567' },
      tenant: { name: 'Barberia', allowReschedule: true },
    };

    prismaMock.appointment.findMany.mockResolvedValue([mockAppointment]);
    prismaMock.appointment.update.mockResolvedValue({});
    whatsappMock.sendTemplateMessage.mockRejectedValue(new Error('Meta API Down'));

    await service.handleSendReminders();

    expect(whatsappMock.sendTemplateMessage).toHaveBeenCalled();
    expect(prismaMock.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-5' },
      data: { whatsappReminderSent: true },
    });
  });
});
