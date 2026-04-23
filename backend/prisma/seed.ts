import { PrismaClient, TenantMode, UserRole, ExceptionType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcrypt'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../../../.env'), override: true })

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🧹 Limpiando base de datos...')
  // Usar deleteMany para limpiar tablas en orden correcto o CASCADE si está configurado.
  // Como Tenant tiene onDelete: Cascade en casi todo, borrar tenants limpia casi todo.
  await prisma.tenant.deleteMany({})
  await prisma.user.deleteMany({})

  console.log('🌱 Creando Tenant y Admin...')
  const passwordHash = await bcrypt.hash('Password123!', 10)

  // Crear Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Barbería Axenda',
      slug: 'barberia-axenda',
      mode: TenantMode.BARBERSHOP,
      active: true,
      
      // Crear Sucursales
      branches: {
        create: [
          { name: 'Sede Palermo', active: true },
          { name: 'Sede Belgrano', active: true }
        ]
      },

      // Crear Usuario Admin
      users: {
        create: [
          {
            firstName: 'Admin',
            lastName: 'Axenda',
            email: 'admin@axenda.com',
            passwordHash,
            role: UserRole.ADMIN,
            active: true
          }
        ]
      },

      // Crear Categorías de Servicios
      serviceCategories: {
        create: [
          { name: 'Cortes', active: true },
          { name: 'Barbería', active: true }
        ]
      }
    },
    include: {
      branches: true,
      serviceCategories: true,
      users: true
    }
  })

  const palermoBranch = tenant.branches.find(b => b.name === 'Sede Palermo')!
  const cortesCat = tenant.serviceCategories.find(c => c.name === 'Cortes')!
  const barbaCat = tenant.serviceCategories.find(c => c.name === 'Barbería')!

  console.log('✂️ Creando Servicios...')
  const corteClasico = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      categoryId: cortesCat.id,
      name: 'Corte Clásico',
      description: 'Corte tradicional a tijera o máquina',
      duration: 45,
      price: 15000,
      color: '#4CAF50',
      active: true
    }
  })

  const corteNavaja = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      categoryId: cortesCat.id,
      name: 'Corte con Navaja',
      description: 'Corte al ras con toalla caliente',
      duration: 60,
      price: 18000,
      color: '#F44336',
      active: true
    }
  })

  const arregloBarba = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      categoryId: barbaCat.id,
      name: 'Arreglo de Barba',
      description: 'Perfilado y rebajado de barba',
      duration: 30,
      price: 10000,
      color: '#FF9800',
      active: true
    }
  })

  console.log('🧔 Creando Profesionales...')
  const leoMessi = await prisma.professional.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Leo',
      lastName: 'Messi',
      bio: 'Barbero Principal',
      color: '#2196F3',
      active: true,
      
      // Asignar sucursal (Palermo)
      branches: {
        create: [ { branchId: palermoBranch.id } ]
      },
      
      // Asignar servicios
      services: {
        create: [
          { serviceId: corteClasico.id },
          { serviceId: corteNavaja.id },
          { serviceId: arregloBarba.id }
        ]
      },

      // Disponibilidad: Lunes a Viernes (1 a 5) de 09:00 a 18:00
      availability: {
        create: [1, 2, 3, 4, 5].map(day => ({
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          branchId: palermoBranch.id
        }))
      },

      // Excepción de prueba (rango)
      exceptions: {
        create: [
          {
            type: ExceptionType.HOLIDAY,
            date: new Date(new Date().setDate(new Date().getDate() + 10)),
            endDate: new Date(new Date().setDate(new Date().getDate() + 15)),
            reason: 'Vacaciones de invierno'
          }
        ]
      }
    }
  })

  const dibuMtz = await prisma.professional.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Dibu',
      lastName: 'Martínez',
      bio: 'Colorista y Barbero',
      color: '#9C27B0',
      active: true,
      
      branches: {
        create: [ { branchId: palermoBranch.id } ]
      },
      
      services: {
        create: [
          { serviceId: corteClasico.id },
          { serviceId: corteNavaja.id }
        ]
      },

      // Disponibilidad: Miércoles a Sábado (3 a 6) de 12:00 a 20:00
      availability: {
        create: [3, 4, 5, 6].map(day => ({
          dayOfWeek: day,
          startTime: '12:00',
          endTime: '20:00',
          branchId: palermoBranch.id
        }))
      }
    }
  })

  console.log('👥 Creando Clientes CRM...')
  const clienteVIP = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@test.com',
      phone: '+5491144445555',
      notes: 'No le gusta esperar',
      active: true,
      tags: {
        create: [ { tenantId: tenant.id, name: 'VIP', color: '#FFD700' } ]
      }
    }
  })

  const clienteNormal = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      firstName: 'María',
      lastName: 'Gómez',
      email: 'maria.gomez@test.com',
      phone: '+5491122223333',
      active: true,
      tags: {
        create: [ { tenantId: tenant.id, name: 'Nuevo', color: '#03A9F4' } ]
      }
    }
  })

  console.log('🎲 Generando 100 Clientes Aleatorios...')
  const { fakerES: faker } = await import('@faker-js/faker')
  
  const randomClients = Array.from({ length: 100 }).map(() => ({
    tenantId: tenant.id,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    phone: faker.phone.number(),
    active: true
  }))

  await prisma.client.createMany({
    data: randomClients
  })

  console.log('📅 Agendando Turnos de Prueba...')
  // Encontrar el próximo Miércoles a las 14:00 (para asegurar que Dibu y Leo trabajen)
  const nextWed = new Date()
  nextWed.setDate(nextWed.getDate() + ((3 + 7 - nextWed.getDay()) % 7 || 7))
  nextWed.setUTCHours(14, 0, 0, 0)
  
  const endWed1 = new Date(nextWed.getTime() + corteClasico.duration * 60000)

  await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      clientId: clienteVIP.id,
      professionalId: leoMessi.id,
      serviceId: corteClasico.id,
      branchId: palermoBranch.id,
      startTime: nextWed,
      endTime: endWed1,
      status: 'CONFIRMED',
      notes: 'Viene apurado',
      logs: {
        create: [
          {
            changedBy: tenant.users[0].id,
            newStatus: 'CONFIRMED',
            notes: 'Turno creado y confirmado desde seed'
          }
        ]
      }
    }
  })

  const nextWedDibu = new Date(nextWed)
  nextWedDibu.setUTCHours(15, 0, 0, 0)
  const endWed2 = new Date(nextWedDibu.getTime() + corteNavaja.duration * 60000)

  await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      clientId: clienteNormal.id,
      professionalId: dibuMtz.id,
      serviceId: corteNavaja.id,
      branchId: palermoBranch.id,
      startTime: nextWedDibu,
      endTime: endWed2,
      status: 'PENDING',
      logs: {
        create: [
          {
            changedBy: tenant.users[0].id,
            newStatus: 'PENDING',
            notes: 'Turno creado desde seed'
          }
        ]
      }
    }
  })

  console.log('✅ Base de datos poblada exitosamente.')
  console.log('🔑 Puedes ingresar con: admin@axenda.com / Password123!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
