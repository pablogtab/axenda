import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { PrismaService } from '../prisma/prisma.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { AvailabilityEngineService } from './availability-engine.service'
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto'
import { CreatePublicAppointmentDto } from './dto/public-appointment.dto'
import { PhoneUtils } from '../common/utils/phone-utils'

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
        bookedVia: 'PANEL'
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
        bookedVia: 'PUBLIC_LINK'
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
          notes: dto.notes
        },
        include: { client: true, professional: true, service: true, branch: true }
      })

      await tx.appointmentLog.create({
        data: {
          appointmentId: id,
          changedBy: userId,
          notes: 'Turno modificado desde administración'
        }
      })

      return updated
    })
  }

  async cancel(tenantId: string, id: string, userId: string) {
    return this.changeStatus(tenantId, id, userId, { status: 'CANCELLED' })
  }
}
