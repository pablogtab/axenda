import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GetAvailabilityDto } from './dto/availability-query.dto'

@Injectable()
export class AvailabilityEngineService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Calcula todos los slots potenciales y marca cuáles están disponibles.
   */
  async getFreeSlots(tenantId: string, dto: GetAvailabilityDto): Promise<{ time: string; available: boolean }[]> {
    const { professionalId, serviceId, branchId, date, duration } = dto

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    })
    const durationMins = duration || service?.duration || 30

    const targetDate = new Date(date + 'T12:00:00Z')
    let dayOfWeek = targetDate.getUTCDay()
    if (dayOfWeek === 0) dayOfWeek = 7 // Domingo es 7, no 0

    const availabilities = await this.prisma.availability.findMany({
      where: { professionalId, dayOfWeek, branchId },
    })

    console.log({ dayOfWeek, availabilities, professionalId, branchId })

    if (availabilities.length === 0) return []

    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59Z')

    const [appointments, exceptions] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          professionalId,
          tenantId,
          branchId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          startTime: { gte: startOfDay, lte: endOfDay },
        }
      }),
      this.prisma.availabilityException.findMany({
        where: {
          professionalId,
          date: { lte: endOfDay },
          OR: [
            { endDate: { gte: startOfDay } },
            { endDate: null }
          ]
        }
      })
    ])

    const isFullDayBlocked = exceptions.some(e => e.type === 'HOLIDAY' || e.type === 'LEAVE' || (e.type === 'BLOCK' && !e.startTime))
    if (isFullDayBlocked) return []

    // Offset para Argentina (UTC-3)
    const offsetMins = -180;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        publicMaxOverlapMins: true,
        publicMaxBookingDays: true,
        publicMinBookingTime: true,
      }
    })

    const allowedOverlap = tenant?.publicMaxOverlapMins ?? 15
    const maxBookingDays = tenant?.publicMaxBookingDays ?? 30
    const minBookingTimeStr = tenant?.publicMinBookingTime || '1h'

    // 1. Validar tiempo máximo de reserva
    const now = new Date()
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + maxBookingDays)

    // Comparación segura de fechas (solo día)
    const checkTarget = new Date(date + 'T12:00:00Z')
    if (checkTarget > maxDate) return []

    const todayStr = new Date(now.getTime() + (offsetMins * 60000)).toISOString().split('T')[0]
    const currentMinsNow = (now.getUTCHours() * 60 + now.getUTCMinutes()) + offsetMins
    const minBookingMins = this.parseTimeToMins(minBookingTimeStr)

    const bookedRanges = appointments.map(app => ({
      start: (app.startTime.getUTCHours() * 60 + app.startTime.getUTCMinutes()) + offsetMins,
      end: (app.endTime.getUTCHours() * 60 + app.endTime.getUTCMinutes()) + offsetMins,
    }))

    exceptions.forEach(ex => {
      if (ex.type === 'BLOCK' && ex.startTime && ex.endTime) {
        bookedRanges.push({
          start: this.timeToMins(ex.startTime),
          end: this.timeToMins(ex.endTime)
        })
      }
    })

    const allSlots: { time: string; available: boolean }[] = []
    const step = 15

    for (const block of availabilities) {
      let current = this.timeToMins(block.startTime)
      const limit = this.timeToMins(block.endTime)

      while (current + durationMins <= limit) {
        const currentEnd = current + durationMins
        const hasConflict = bookedRanges.some(b => {
          const conflict = (current < (b.end - allowedOverlap)) && (currentEnd > (b.start + allowedOverlap));
          return conflict;
        })

        const isTooSoon = date === todayStr && current < (currentMinsNow + minBookingMins)

        allSlots.push({
          time: this.minsToTime(current),
          available: !hasConflict && !isTooSoon
        })
        current += step
      }
    }

    return allSlots
  }

  private parseTimeToMins(timeStr: string): number {
    const match = timeStr.match(/^(\d+)(h|m)$/)
    if (!match) return 60 // default 1h if invalid
    const value = parseInt(match[1])
    const unit = match[2]
    return unit === 'h' ? value * 60 : value
  }

  async isSlotAvailable(tenantId: string, data: any): Promise<boolean> {
    const start = new Date(data.startTime)
    // Ajustar a la hora local de Argentina para obtener el string de fecha correcto
    const localDate = new Date(start.getTime() + (-180 * 60000))
    const dateStr = localDate.toISOString().split('T')[0]

    const slots = await this.getFreeSlots(tenantId, { ...data, date: dateStr })

    const mins = (start.getUTCHours() * 60 + start.getUTCMinutes()) - 180
    const timeStr = this.minsToTime(mins)

    return slots.find(s => s.time === timeStr)?.available || false
  }


  private timeToMins(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  private minsToTime(m: number): string {
    const hh = Math.floor(m / 60).toString().padStart(2, '0')
    const mm = (m % 60).toString().padStart(2, '0')
    return `${hh}:${mm}`
  }
}
