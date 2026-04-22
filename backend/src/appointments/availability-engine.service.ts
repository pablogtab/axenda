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
    // Asumimos timezone UTC/local estándar (getUTCDay para evitar saltos por zona de máquina)
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

    // 4. Buscar excepciones (vacaciones o bloqueos parciales) para ese día
    // Consideramos la fecha exacta (rango de 24hs)
    const startOfDay = new Date(targetDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    const exceptions = await this.prisma.availabilityException.findMany({
      where: {
        professionalId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    // Si hay una excepción de día completo (tipo UNAVAILABLE sin startTime), devolvemos vacío
    const fullDayException = exceptions.find((e) => e.type === 'UNAVAILABLE' && !e.startTime)
    if (fullDayException) return []

    // 5. Buscar turnos (Appointments) ya agendados para ese profesional ese día
    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        tenantId,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'], // Turnos cancelados no ocupan lugar
        },
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { startTime: true, endTime: true },
    })

    // 6. Calcular slots
    // Convertimos turnos y bloqueos a minutos desde las 00:00 para facilitar matemática
    const bookedRanges = appointments.map((app) => ({
      start: app.startTime.getUTCHours() * 60 + app.startTime.getUTCMinutes(),
      end: app.endTime.getUTCHours() * 60 + app.endTime.getUTCMinutes(),
    }))

    // Agregar bloqueos parciales (excepciones BLOCKED con horas)
    exceptions.forEach((ex) => {
      if (ex.startTime && ex.endTime) {
        bookedRanges.push({
          start: this.timeToMins(ex.startTime),
          end: this.timeToMins(ex.endTime),
        })
      }
    })

    // Ordenar rangos ocupados
    bookedRanges.sort((a, b) => a.start - b.start)

    const freeSlots: string[] = []

    // Por cada bloque de disponibilidad, buscar huecos
    // Ejemplo: trabaja de 09:00 a 13:00 y de 14:00 a 18:00
    for (const block of availabilities) {
      let currentMins = this.timeToMins(block.startTime)
      const endMins = this.timeToMins(block.endTime)

      // Iterar cada X minutos (ej. generamos slots cada 15 o 30 mins)
      // Para mayor exactitud, iteramos por el intervalo mínimo (ej 15 mins),
      // o directamente por la duración del servicio. Haremos pasos de 15 mins.
      const step = 15 

      while (currentMins + durationMins <= endMins) {
        const slotEnd = currentMins + durationMins
        
        // Chequear choque con ocupaciones
        let hasConflict = false
        for (const b of bookedRanges) {
          // Si el turno propuesto se solapa con algo agendado:
          // A.start < B.end AND A.end > B.start
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

    return [...new Set(freeSlots)] // Remover duplicados si los hubiera
  }

  // ─── Helpers Matemáticos ───────────────────────────────────────────────────

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
