import { PrismaClient, TenantMode, UserRole, ExceptionType, AuthProvider } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcrypt'
import * as dotenv from 'dotenv'
import { resolve, join } from 'path'
import * as fs from 'fs'
import * as path from 'path'

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
      publicSlug: 'barberia-axenda',
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
            role: UserRole.ADMIN,
            active: true,
            identities: {
              create: [
                {
                  provider: AuthProvider.EMAIL,
                  providerId: 'admin@axenda.com',
                  passwordHash
                }
              ]
            }
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

  // Copiar archivos de desarrollo (Logo y Banner)
  console.log('🖼️  Configurando archivos de desarrollo...')
  const uploadsDir = path.join(__dirname, '../uploads')
  const tenantDir = path.join(uploadsDir, 'tenants', tenant.id)
  const logosDir = path.join(tenantDir, 'logos')
  const bannersDir = path.join(tenantDir, 'banners')

  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true })
  if (!fs.existsSync(bannersDir)) fs.mkdirSync(bannersDir, { recursive: true })

  const devLogoPath = path.join(__dirname, '../development/barberhop_logo.png')
  const devBannerPath = path.join(__dirname, '../development/test_banner.jfif')

  let logoUrl = null
  let bannerUrl = null

  if (fs.existsSync(devLogoPath)) {
    const logoName = 'barberhop_logo.png'
    fs.copyFileSync(devLogoPath, path.join(logosDir, logoName))
    logoUrl = `tenants/${tenant.id}/logos/${logoName}`
    console.log('✅ Logo copiado')
  }

  if (fs.existsSync(devBannerPath)) {
    const bannerName = 'test_banner.jfif'
    fs.copyFileSync(devBannerPath, path.join(bannersDir, bannerName))
    bannerUrl = `tenants/${tenant.id}/banners/${bannerName}`
    console.log('✅ Banner copiado')
  }

  if (logoUrl || bannerUrl) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined
      }
    })
  }

  const palermoBranch = tenant.branches.find(b => b.name === 'Sede Palermo')!
  const cortesCat = tenant.serviceCategories.find(c => c.name === 'Cortes')!
  const barbaCat = tenant.serviceCategories.find(c => c.name === 'Barbería')!

  console.log('🌸 Creando segundo Tenant (Estética Bella)...')
  await prisma.tenant.create({
    data: {
      name: 'Estética Bella',
      slug: 'estetica-bella',
      publicSlug: 'estetica-bella',
      mode: TenantMode.GENERIC,
      users: {
        create: [
          {
            firstName: 'Maria',
            lastName: 'Estetica',
            email: 'maria@estetica.com',
            role: UserRole.ADMIN,
            identities: {
              create: [
                {
                  provider: AuthProvider.EMAIL,
                  providerId: 'maria@estetica.com',
                  passwordHash
                }
              ]
            }
          }
        ]
      }
    }
  })

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

  console.log('📅 Agendando Turnos de Prueba (Hoy, Mañana y Pasado)...')
  
  const belgranoBranch = tenant.branches.find(b => b.name === 'Sede Belgrano')!
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Función auxiliar para crear turnos fáciles
  const createAppt = async (dayOffset: number, hour: number, profId: string, servId: string, branchId: string, notes: string) => {
    const start = new Date(today)
    start.setDate(start.getDate() + dayOffset)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start.getTime() + 45 * 60000)
    
    return prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        clientId: clienteVIP.id,
        professionalId: profId,
        serviceId: servId,
        branchId: branchId,
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
        notes,
        logs: { create: [{ changedBy: tenant.users[0].id, newStatus: 'CONFIRMED', notes: 'Seed' }] }
      }
    })
  }

  // --- HOY ---
  await createAppt(0, 10, leoMessi.id, corteClasico.id, palermoBranch.id, 'Turno Hoy Palermo')
  await createAppt(0, 14, dibuMtz.id, corteNavaja.id, belgranoBranch.id, 'Turno Hoy Belgrano')

  // --- MAÑANA ---
  await createAppt(1, 11, leoMessi.id, corteNavaja.id, palermoBranch.id, 'Turno Mañana Palermo')
  await createAppt(1, 15, dibuMtz.id, arregloBarba.id, belgranoBranch.id, 'Turno Mañana Belgrano')

  // --- PASADO MAÑANA ---
  await createAppt(2, 0, leoMessi.id, arregloBarba.id, palermoBranch.id, 'Turno Pasado Mañana')

  console.log('🛡️ Creando al Cuti Romero (Exclusivo Belgrano)...')
  const cutiRomero = await prisma.professional.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Cuti',
      lastName: 'Romero',
      bio: 'Especialista en cortes agresivos',
      color: '#009688',
      active: true,
      branches: { create: [{ branchId: belgranoBranch.id }] },
      services: { create: [{ serviceId: corteClasico.id }, { serviceId: corteNavaja.id }] }
    }
  })

  // Disponibilidad del Cuti: Lunes a Sábado en Belgrano
  for (let i = 1; i <= 6; i++) {
    await prisma.availability.create({
      data: { professionalId: cutiRomero.id, dayOfWeek: i, startTime: '09:00', endTime: '20:00', branchId: belgranoBranch.id }
    })
  }

  // Turnos para el Cuti
  await createAppt(0, 16, cutiRomero.id, corteClasico.id, belgranoBranch.id, 'Cuti Hoy')
  await createAppt(1, 12, cutiRomero.id, corteNavaja.id, belgranoBranch.id, 'Cuti Mañana')
  
  // Asegurar disponibilidad para esos días
  const days = [today.getDay(), (today.getDay() + 1) % 7, (today.getDay() + 2) % 7]
  for (const day of days) {
    // Leo en Palermo (Si no la tiene ya de 1-5)
    if (day === 0 || day === 6) {
      await prisma.availability.create({
        data: { professionalId: leoMessi.id, dayOfWeek: day, startTime: '09:00', endTime: '18:00', branchId: palermoBranch.id }
      }).catch(() => null)
    }
    
    // Dibu en Belgrano
    await prisma.availability.create({
      data: { professionalId: dibuMtz.id, dayOfWeek: day, startTime: '09:00', endTime: '20:00', branchId: belgranoBranch.id }
    }).catch(() => null)

    // Leo en Belgrano (Nuevo!)
    await prisma.availability.create({
      data: { professionalId: leoMessi.id, dayOfWeek: day, startTime: '09:00', endTime: '18:00', branchId: belgranoBranch.id }
    }).catch(() => null)
  }

  // Asegurar que Leo esté en la rama Belgrano
  await prisma.professionalBranch.create({
    data: { professionalId: leoMessi.id, branchId: belgranoBranch.id }
  }).catch(() => null)

  // Asegurar que Dibu esté en la rama Belgrano
  await prisma.professionalBranch.create({
    data: { professionalId: dibuMtz.id, branchId: belgranoBranch.id }
  }).catch(() => null)

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
