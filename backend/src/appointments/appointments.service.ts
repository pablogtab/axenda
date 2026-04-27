import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AvailabilityEngineService } from './availability-engine.service'
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto'
import { CreatePublicAppointmentDto } from './dto/public-appointment.dto'
import { BookingSource } from '@prisma/client'

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AvailabilityEngineService,
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

    // 3. (OPCIONAL EN ESTE PASO PERO RECOMENDADO): Validar choque de horarios en backend.
    // Como pediste luego sobreturnos, podríamos omitir la validación rígida y confiar en la UI
    // o hacer una validación soft. Por ahora, asumimos que si llega aquí, la UI lo calculó,
    // o calculamos el EndTime base.
    const start = new Date(dto.startTime)
    const end = new Date(start.getTime() + service.duration * 60000)

    // 4. Crear turno y audit log en transacción
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          tenantId,
          clientId: dto.clientId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          branchId: dto.branchId,
          startTime: start,
          endTime: end,
          notes: dto.notes,
          internalNotes: dto.internalNotes,
          status: dto.status || 'PENDING',
        },
      })

      await tx.appointmentLog.create({
        data: {
          appointmentId: appointment.id,
          changedBy: userId,
          newStatus: appointment.status,
          notes: 'Turno creado',
        },
      })

      return appointment
    })
  }

  async changeStatus(tenantId: string, id: string, userId: string, dto: UpdateAppointmentStatusDto) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
    })
    if (!appointment) throw new NotFoundException(`Turno ${id} no encontrado`)

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: dto.status },
      })

      await tx.appointmentLog.create({
        data: {
          appointmentId: id,
          changedBy: userId,
          oldStatus: appointment.status,
          newStatus: dto.status,
          notes: dto.notes || `Status changed to ${dto.status}`,
        },
      })

      return updated
    })
  }

  async update(tenantId: string, id: string, userId: string, dto: any) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: { service: true }
    })
    if (!appointment) throw new NotFoundException(`Turno ${id} no encontrado`)

    // Si cambia el startTime, recalculamos el endTime basado en la duración del servicio
    const data: any = { ...dto }
    if (dto.startTime && !dto.endTime) {
      const start = new Date(dto.startTime)
      data.endTime = new Date(start.getTime() + appointment.service.duration * 60000)
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data
      })

      await tx.appointmentLog.create({
        data: {
          appointmentId: id,
          changedBy: userId,
          notes: 'Turno reprogramado o reasignado'
        },
      })

      return updated
    })
  }

  async cancel(tenantId: string, id: string, userId: string) {
    return this.changeStatus(tenantId, id, userId, { status: 'CANCELLED' })
  }

  async createFromPublic(tenantId: string, dto: CreatePublicAppointmentDto) {
    // 1. Validar IDs de negocio (ya validado en controller pero doble check es sano)
    const professional = await this.prisma.professional.findFirst({ where: { id: dto.professionalId, tenantId } })
    if (!professional) throw new NotFoundException('Profesional no encontrado')

    const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, tenantId } })
    if (!service) throw new NotFoundException('Servicio no encontrado')

    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')

    // 2. Buscar o Crear Cliente
    let client = await this.prisma.client.findFirst({
      where: {
        tenantId,
        OR: [
          { email: dto.clientEmail },
          { phone: dto.clientPhone }
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
          phone: dto.clientPhone,
        }
      })
    }

    // 3. Calcular EndTime
    const start = new Date(dto.startTime)
    const end = new Date(start.getTime() + service.duration * 60000)

    // 4. Crear turno en transacción
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          tenantId,
          clientId: client!.id,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          branchId: dto.branchId,
          startTime: start,
          endTime: end,
          notes: dto.notes,
          bookedVia: BookingSource.PUBLIC_LINK,
          status: 'PENDING', // Por defecto los públicos quedan pendientes
        },
      })

      await tx.appointmentLog.create({
        data: {
          appointmentId: appointment.id,
          changedBy: 'CLIENT',
          newStatus: appointment.status,
          notes: 'Turno agendado vía link público',
        },
      })

      return appointment
    })
  }
}
