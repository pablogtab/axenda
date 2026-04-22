import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AvailabilityEngineService } from './availability-engine.service'
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto'

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

  async findAll(tenantId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId },
      include: {
        client: true,
        professional: true,
        service: true,
      },
      orderBy: { startTime: 'asc' },
    })
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
          status: 'PENDING',
        },
      })

      await tx.appointmentLog.create({
        data: {
          appointmentId: appointment.id,
          changedBy: userId,
          newStatus: 'PENDING',
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

  async cancel(tenantId: string, id: string, userId: string) {
    return this.changeStatus(tenantId, id, userId, { status: 'CANCELLED' })
  }
}
