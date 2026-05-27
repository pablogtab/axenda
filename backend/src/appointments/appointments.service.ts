import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { PrismaService } from '../prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { AvailabilityEngineService } from './availability-engine.service'
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto'
import { CreatePublicAppointmentDto } from './dto/public-appointment.dto'
import { PhoneUtils } from '../common/utils/phone-utils'
import { randomUUID } from 'crypto'

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AvailabilityEngineService,
    private readonly eventEmitter: EventEmitter2,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // ─── Consultar Disponibilidad ─────────────────────────────────────────────

  async getAvailability(tenantId: string, dto: any) {
    return this.engine.getFreeSlots(tenantId, dto)
  }

  // ─── Turnos (Appointments) ────────────────────────────────────────────────

  async findAll(tenantId: string, query: { startDate?: string; endDate?: string; branchId?: string; statuses?: string[] }) {
    const where: any = { tenantId }

    if (query.branchId) {
      where.branchId = query.branchId
    }
    
    if (query.statuses && query.statuses.length > 0) {
      where.status = { in: query.statuses }
    }

    if (query.startDate || query.endDate) {
      where.startTime = {}
      if (query.startDate) {
        where.startTime.gte = new Date(query.startDate)
      }
      if (query.endDate) {
        where.startTime.lte = new Date(query.endDate)
      }
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        client: true,
        professional: true,
        service: true,
        branch: true
      },
      orderBy: { startTime: 'asc' },
    })
  }

  async findOne(tenantId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        professional: true,
        service: true,
        branch: true
      }
    })
    if (!appointment) throw new NotFoundException(`Turno ${id} no encontrado`)
    return appointment
  }

  async create(tenantId: string, userId: string, dto: CreateAppointmentDto) {
    // 0. Validar límites de suscripción
    await this.subscriptionsService.validateLimit(tenantId, 'APPOINTMENTS');

    // 1. Validar IDs
    const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, tenantId } })
    if (!client) throw new NotFoundException('Cliente no encontrado')

    const professional = await this.prisma.professional.findFirst({ where: { id: dto.professionalId, tenantId } })
    if (!professional) throw new NotFoundException('Profesional no encontrado')

    const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, tenantId } })
    if (!service) throw new NotFoundException('Servicio no encontrado')

    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')

    // 2. Verificar que el profesional ofrezca ese servicio (pivot)
    const profService = await this.prisma.professionalService.findFirst({
      where: { professionalId: dto.professionalId, serviceId: dto.serviceId },
    })
    if (!profService) {
      throw new BadRequestException('El profesional no ofrece este servicio')
    }

    // 3. Calcular EndTime
    const start = new Date(dto.startTime)
    const end = new Date(start.getTime() + service.duration * 60000)

    // 5. Crear turno
    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        branchId: dto.branchId,
        startTime: start,
        endTime: end,
        notes: dto.notes,
        status: 'PENDING',
        bookedVia: 'PANEL',
        cancelToken: randomUUID()
      },
      include: {
        client: true,
        professional: true,
        service: true,
        branch: true
      }
    })



    // 6. Log inicial
    await this.prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        changedBy: userId,
        newStatus: 'PENDING',
        notes: 'Turno creado desde administración'
      }
    })

    // 7. Disparar evento para WhatsApp/Mail
    this.eventEmitter.emit('appointment.created', appointment)

    return appointment
  }

  async createFromPublic(tenantId: string, dto: CreatePublicAppointmentDto) {
    // 0. Validar límites de suscripción
    await this.subscriptionsService.validateLimit(tenantId, 'APPOINTMENTS');

    // 1. Validar IDs de negocio
    const professional = await this.prisma.professional.findFirst({ where: { id: dto.professionalId, tenantId } })
    if (!professional) throw new NotFoundException('Profesional no encontrado')

    const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, tenantId } })
    if (!service) throw new NotFoundException('Servicio no encontrado')

    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')

    // Normalizar el teléfono antes de buscar o crear
    const normalizedPhone = PhoneUtils.normalize(dto.clientPhone);

    // 2. Buscar o Crear Cliente
    let client = await this.prisma.client.findFirst({
      where: {
        tenantId,
        OR: [
          { email: dto.clientEmail },
          { phone: normalizedPhone }
        ]
      }
    })

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          tenantId,
          firstName: dto.clientName.split(' ')[0],
          lastName: dto.clientName.split(' ').slice(1).join(' ') || '',
          email: dto.clientEmail,
          phone: normalizedPhone,
        }
      })
    }

    // 3. Validar disponibilidad
    const start = new Date(dto.startTime)
    const isAvailable = await this.engine.isSlotAvailable(tenantId, {
      professionalId: dto.professionalId,
      serviceId: dto.serviceId,
      branchId: dto.branchId,
      startTime: start,
    })

    if (!isAvailable) {
      throw new BadRequestException('El horario seleccionado ya no está disponible')
    }

    // 4. Calcular EndTime
    const end = new Date(start.getTime() + service.duration * 60000)

    // 5. Crear turno
    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId,
        clientId: client.id,
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        branchId: dto.branchId,
        startTime: start,
        endTime: end,
        notes: dto.notes,
        status: 'PENDING',
        bookedVia: 'PUBLIC_LINK',
        cancelToken: randomUUID()
      },
      include: {
        client: true,
        professional: true,
        service: true,
        branch: true
      }
    })

    // 6. Log inicial
    await this.prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        newStatus: 'PENDING',
        notes: 'Turno reservado desde página pública'
      }
    })

    // 7. Disparar evento para WhatsApp/Mail
    this.eventEmitter.emit('appointment.created', appointment)

    return appointment
  }

  async changeStatus(tenantId: string, id: string, userId: string, dto: UpdateAppointmentStatusDto) {
    const appointment = await this.findOne(tenantId, id)
    
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: dto.status },
      include: { client: true, professional: true, service: true, branch: true }
    })

    await this.prisma.appointmentLog.create({
      data: {
        appointmentId: id,
        changedBy: userId,
        oldStatus: appointment.status,
        newStatus: dto.status,
        notes: dto.notes || 'Cambio de estado manual'
      }
    })

    if (dto.status === 'CANCELLED' && appointment.status !== 'CANCELLED') {
      this.eventEmitter.emit('appointment.cancelled', {
        appointment: updated,
        notifyClient: dto.notifyClient !== false
      })
    }

    return updated
  }

  async update(tenantId: string, id: string, userId: string, dto: CreateAppointmentDto) {
    const appointment = await this.findOne(tenantId, id)
    
    // Si se cambia horario o profesional, validar disponibilidad
    // (Simplificado: asumimos que se puede siempre que sea el mismo o haya lugar)
    const start = new Date(dto.startTime)
    const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, tenantId } })
    const end = new Date(start.getTime() + service.duration * 60000)

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          clientId: dto.clientId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          branchId: dto.branchId,
          startTime: start,
          endTime: end,
          notes: dto.notes,
          internalNotes: dto.internalNotes,
          status: dto.status,
        },
        include: { client: true, professional: true, service: true, branch: true }
      })

      await tx.appointmentLog.create({
        data: {
          appointmentId: id,
          changedBy: userId,
          oldStatus: appointment.status,
          newStatus: dto.status || appointment.status,
          notes: 'Turno modificado desde administración'
        }
      })

      if (dto.status === 'CANCELLED' && appointment.status !== 'CANCELLED') {
        this.eventEmitter.emit('appointment.cancelled', {
          appointment: updated,
          notifyClient: dto.notifyClient !== false
        })
      }

      return updated
    })
  }

  async cancel(tenantId: string, id: string, userId: string, notifyClient = true) {
    return this.changeStatus(tenantId, id, userId, { status: 'CANCELLED', notifyClient })
  }

  async findOneByToken(tokenOrId: string) {
    let appointment = await this.prisma.appointment.findFirst({
      where: {
        OR: [
          { cancelToken: tokenOrId },
          { id: tokenOrId }
        ]
      },
      include: {
        client: true,
        professional: {
          include: {
            availability: true,
            exceptions: true
          }
        },
        service: true,
        branch: true,
        tenant: {
          select: {
            id: true,
            name: true,
            publicSlug: true,
            logoUrl: true,
            primaryColor: true,
            primaryHoverColor: true,
            accentColor: true,
            backgroundColor: true,
            textColor: true,
            allowReschedule: true,
            whatsappCancellation: true,
            publicActive: true,
            cancellationLimit: true,
            phone: true,
            email: true,
            branches: {
              where: { active: true },
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        }
      }
    });

    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }

    // Lazy migration: generar cancelToken para turnos viejos
    if (!appointment.cancelToken) {
      appointment = await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { cancelToken: randomUUID() },
        include: {
          client: true,
          professional: {
            include: {
              availability: true,
              exceptions: true
            }
          },
          service: true,
          branch: true,
          tenant: {
            select: {
              id: true,
              name: true,
              publicSlug: true,
              logoUrl: true,
              primaryColor: true,
              primaryHoverColor: true,
              accentColor: true,
              backgroundColor: true,
              textColor: true,
              allowReschedule: true,
              whatsappCancellation: true,
              publicActive: true,
              cancellationLimit: true,
              phone: true,
              email: true,
              branches: {
                where: { active: true },
                select: {
                  id: true,
                  name: true,
                  address: true
                }
              }
            }
          }
        }
      });
    }

    if (!appointment.tenant.publicActive) {
      throw new NotFoundException('Negocio no encontrado');
    }

    return appointment;
  }

  private validateCancellationLimit(appointment: any) {
    const limit = appointment.tenant.cancellationLimit || '24h';

    if (limit === 'never') {
      throw new ForbiddenException('Este negocio no permite cancelaciones o reprogramaciones online.');
    }

    // Convert limit to minutes
    let limitMins = 24 * 60; // default 24h
    const match = limit.match(/^(\d+)([hm])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      if (unit === 'h') {
        limitMins = value * 60;
      } else if (unit === 'm') {
        limitMins = value;
      }
    }

    const now = new Date();
    const appointmentStart = new Date(appointment.startTime);
    const diffMs = appointmentStart.getTime() - now.getTime();
    const diffMins = diffMs / 60000;

    if (diffMins < limitMins) {
      const limitHours = limitMins / 60;
      const limitText = limitHours >= 1 
        ? `${limitHours} ${limitHours === 1 ? 'hora' : 'horas'}`
        : `${limitMins} minutos`;
        
      throw new BadRequestException(
        `El plazo para cancelar o reprogramar online ha expirado. Debe realizarse con al menos ${limitText} de anticipación.`
      );
    }
  }

  async cancelByToken(tokenOrId: string, notifyClient = true) {
    const appointment = await this.findOneByToken(tokenOrId);
    
    this.validateCancellationLimit(appointment);

    if (appointment.status === 'CANCELLED') {
      return appointment;
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CANCELLED' },
      include: { client: true, professional: true, service: true, branch: true }
    });

    await this.prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        changedBy: 'CLIENT_PUBLIC',
        oldStatus: appointment.status,
        newStatus: 'CANCELLED',
        notes: 'Turno cancelado por el cliente desde la página pública'
      }
    });

    this.eventEmitter.emit('appointment.cancelled', {
      appointment: updated,
      notifyClient
    });

    return updated;
  }

  async rescheduleByToken(tokenOrId: string, newStartTime: string) {
    const appointment = await this.findOneByToken(tokenOrId);

    if (!appointment.tenant.allowReschedule) {
      throw new ForbiddenException('Este negocio no permite reprogramar turnos online.');
    }

    this.validateCancellationLimit(appointment);

    const start = new Date(newStartTime);
    
    // Validar disponibilidad
    const isAvailable = await this.engine.isSlotAvailable(appointment.tenantId, {
      professionalId: appointment.professionalId,
      serviceId: appointment.serviceId,
      branchId: appointment.branchId,
      startTime: start,
      excludeAppointmentId: appointment.id,
    });

    if (!isAvailable) {
      throw new BadRequestException('El horario seleccionado ya no está disponible');
    }

    const end = new Date(start.getTime() + appointment.service.duration * 60000);

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        startTime: start,
        endTime: end,
        status: 'PENDING',
      },
      include: { client: true, professional: true, service: true, branch: true }
    });

    await this.prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        changedBy: 'CLIENT_PUBLIC',
        oldStatus: appointment.status,
        newStatus: 'PENDING',
        notes: `Turno reprogramado por el cliente desde la página pública. Nuevo horario: ${start.toISOString()}`
      }
    });

    // Disparar evento para enviar confirmación del nuevo horario
    this.eventEmitter.emit('appointment.created', updated);

    return updated;
  }
}
