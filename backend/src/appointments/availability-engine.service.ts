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

    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getUTCDay()

    const availabilities = await this.prisma.availability.findMany({
      where: { professionalId, dayOfWeek, branchId },
    })
    if (availabilities.length === 0) return []

    const startOfDay = new Date(date)
    const endOfDay = new Date(date)
    endOfDay.setUTCHours(23, 59, 59, 999)

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
      select: { publicMaxOverlapMins: true }
    })

    // Default allowed overlap (e.g., 15 minutes) if the tenant hasn't configured it
    const allowedOverlap = tenant?.publicMaxOverlapMins || 15

    // Obtener minutos actuales si estamos consultando para "hoy"
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentMinsNow = (now.getUTCHours() * 60 + now.getUTCMinutes()) + offsetMins

    console.log('appointments', appointments)
    console.log('exceptions', exceptions)
    console.log('currentMinsNow', currentMinsNow)
    console.log('todayStr', todayStr)
    console.log('allowedOverlap', allowedOverlap)

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
    
    console.log('bookedRanges', bookedRanges.map(r => `${this.minsToTime(r.start)} - ${this.minsToTime(r.end)}`).join(', '))
    console.log('availabilities', availabilities.map(a => `${this.minsToTime(this.timeToMins(a.startTime))} - ${this.minsToTime(this.timeToMins(a.endTime))}`).join(', '))

    for (const block of availabilities) {
      let current = this.timeToMins(block.startTime)
      const limit = this.timeToMins(block.endTime)

      while (current + durationMins <= limit) {
        const currentEnd = current + durationMins
        const hasConflict = bookedRanges.some(b => {
          const conflict = (current < (b.end - allowedOverlap)) && (currentEnd > (b.start + allowedOverlap));
          return conflict;
        })
        
        const isPast = date === todayStr && current <= currentMinsNow
        
        allSlots.push({
          time: this.minsToTime(current),
          available: !hasConflict && !isPast
        })
        current += step
      }
    }

    return allSlots
  }

  async isSlotAvailable(tenantId: string, data: any): Promise<boolean> {
    const dateStr = new Date(data.startTime).toISOString().split('T')[0]
    const slots = await this.getFreeSlots(tenantId, { ...data, date: dateStr })

    const date = new Date(data.startTime)
    const mins = (date.getUTCHours() * 60 + date.getUTCMinutes()) - 180
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
