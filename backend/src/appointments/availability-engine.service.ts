import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GetAvailabilityDto } from './dto/availability-query.dto'

@Injectable()
export class AvailabilityEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula los "slots" libres para un profesional, un servicio, y un día.
   */
  async getFreeSlots(tenantId: string, dto: GetAvailabilityDto) {
    const { professionalId, serviceId, branchId, date, duration } = dto

    // 1. Obtener datos clave: duración del servicio
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId, active: true },
    })
    if (!service) throw new BadRequestException('Servicio no encontrado o inactivo')

    const durationMins = duration || service.duration

    // 2. Determinar el día de la semana (0 = Sunday, 1 = Monday...)
    const targetDate = new Date(date)
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Formato de fecha inválido')
    }
    
    // Normalizar fechas para comparación (solo fecha, sin hora)
    const startOfDay = new Date(targetDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    const dayOfWeek = targetDate.getUTCDay()

    // 3. Buscar disponibilidad del profesional (horarios fijos de la semana)
    const availabilities = await this.prisma.availability.findMany({
      where: {
        professionalId,
        dayOfWeek,
        branchId,
      },
    })

    if (availabilities.length === 0) {
      return [] // No trabaja este día en esta sucursal
    }

    // 4. Buscar excepciones (vacaciones o bloqueos parciales) que afecten este día
    // Ahora soportamos rangos (endDate)
    const exceptions = await this.prisma.availabilityException.findMany({
      where: {
        professionalId,
        OR: [
          // Caso A: La excepción empieza hoy (con o sin fin)
          { date: { gte: startOfDay, lte: endOfDay } },
          // Caso B: El día de hoy está "atrapado" entre date y endDate
          {
            AND: [
              { date: { lte: startOfDay } },
              { endDate: { gte: startOfDay } }
            ]
          }
        ]
      },
    })

    // Si hay una excepción de día completo, devolvemos vacío
    // Los tipos HOLIDAY y LEAVE se consideran de día completo por defecto.
    // BLOCK puede ser parcial si tiene startTime.
    const fullDayTypes = ['HOLIDAY', 'LEAVE']
    const isFullDayBlocked = exceptions.some(e => 
      fullDayTypes.includes(e.type) || (e.type === 'BLOCK' && !e.startTime)
    )
    
    if (isFullDayBlocked) return []

    // 5. Buscar turnos (Appointments) ya agendados
    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        tenantId,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { startTime: true, endTime: true },
    })

    // 6. Calcular slots
    const bookedRanges = appointments.map((app) => ({
      start: app.startTime.getUTCHours() * 60 + app.startTime.getUTCMinutes(),
      end: app.endTime.getUTCHours() * 60 + app.endTime.getUTCMinutes(),
    }))

    // Agregar bloqueos parciales (excepciones BLOCK con horas)
    exceptions.forEach((ex) => {
      if (ex.type === 'BLOCK' && ex.startTime && ex.endTime) {
        bookedRanges.push({
          start: this.timeToMins(ex.startTime),
          end: this.timeToMins(ex.endTime),
        })
      }
    })

    bookedRanges.sort((a, b) => a.start - b.start)

    const freeSlots: string[] = []

    for (const block of availabilities) {
      let currentMins = this.timeToMins(block.startTime)
      const endMins = this.timeToMins(block.endTime)
      const step = 15 

      while (currentMins + durationMins <= endMins) {
        const slotEnd = currentMins + durationMins
        let hasConflict = false
        
        for (const b of bookedRanges) {
          if (currentMins < b.end && slotEnd > b.start) {
            hasConflict = true
            break
          }
        }

        if (!hasConflict) {
          freeSlots.push(this.minsToTime(currentMins))
        }

        currentMins += step
      }
    }

    return [...new Set(freeSlots)]
  }

  private timeToMins(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  private minsToTime(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
}
