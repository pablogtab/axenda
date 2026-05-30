// c:\projects\personal\axenda\backend\prisma\seed.ts

import { PrismaClient, TenantMode, ExceptionType, AuthProvider, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcrypt'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: resolve(__dirname, '../../../.env'), override: true })

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// --- Flags de ejecución ---
const DANGER_RESET = process.argv.includes('--danger-reset-all');
const WITH_SAMPLES = process.argv.includes('--with-samples');

async function seedSubscriptionPlans() {
  console.log('💎 Sincronizando Planes de Suscripción (System Data)...')

  const plans: Prisma.SubscriptionPlanCreateInput[] = [
    {
      code: 'STARTER',
      name: 'Starter',
      description: 'Inicio / Exploración',
      priceMonthly: 0,
      priceYearly: 0,
      maxProfessionals: 1,
      maxBranches: 1,
      maxAppointments: 25,
      maxUsers: 1,
      maxWhatsapp: 0,
      hasReports: false,
      hasOnlinePayments: false,
      hasAutoReviews: false,
    },
    {
      code: 'PRO',
      name: 'Pro',
      description: 'Profesional Independiente',
      priceMonthly: 12500,
      priceYearly: 120000,
      maxProfessionals: 1,
      maxBranches: 1,
      maxAppointments: 999999,
      maxUsers: 2,
      maxWhatsapp: 100,
      hasReports: true,
      hasOnlinePayments: true,
      hasAutoReviews: true,
    },
    {
      code: 'BUSINESS',
      name: 'Business',
      description: 'Negocio en Crecimiento',
      priceMonthly: 24500,
      priceYearly: 235200,
      maxProfessionals: 5,
      maxBranches: 3,
      maxAppointments: 999999,
      maxUsers: 10,
      maxWhatsapp: 300,
      hasReports: true,
      hasOnlinePayments: true,
      hasAutoReviews: true,
    },
    {
      code: 'ELITE',
      name: 'Elite',
      description: 'Élite & Marca Personal',
      priceMonthly: 48000,
      priceYearly: 460800,
      maxProfessionals: 99,
      maxBranches: 99,
      maxAppointments: 999999,
      maxUsers: 99,
      maxWhatsapp: 1000,
      hasReports: true,
      hasOnlinePayments: true,
      hasAutoReviews: true,
    }
  ]

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    })
    console.log(`✅ Plan ${plan.code} sincronizado.`)
  }
  console.log('✅ Planes de suscripción actualizados.')
}

async function seedSampleBusiness() {
  console.log('🌱 Sembrando Negocios de Prueba (Sample Data)...')

  const passwordHash = await bcrypt.hash('Password123!', 10)
  const proPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'PRO' } })

  if (!proPlan) {
    throw new Error('El plan PRO debe existir antes de crear el negocio de prueba.')
  }

  // Crear Tenant con Suscripción en Trial
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Barbería Axenda',
      slug: 'barberia-axenda',
      publicSlug: 'barberia-axenda',
      mode: TenantMode.BARBERSHOP,
      email: 'admin@axenda.com',
      address: 'Sede Palermo 123',
      active: true,
      onboardingCompleted: true,
      subscription: {
        create: {
          planId: proPlan.id,
          status: 'TRIALING',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días
        }
      },
      branches: {
        create: [
          { name: 'Sede Palermo', active: true },
          { name: 'Sede Belgrano', active: true }
        ]
      },
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

  // --- Lógica de archivos (desarrollo local) ---
  const uploadsDir = path.join(__dirname, '../uploads')
  const tenantDir = path.join(uploadsDir, 'tenants', tenant.id)
  if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true })

  const devLogoPath = path.join(__dirname, '../development/barberhop_logo.png')
  if (fs.existsSync(devLogoPath)) {
    const logosDir = path.join(tenantDir, 'logos')
    if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true })
    fs.copyFileSync(devLogoPath, path.join(logosDir, 'barberhop_logo.png'))
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { logoUrl: `tenants/${tenant.id}/logos/barberhop_logo.png` }
    })
    console.log('✅ Logo de prueba copiado.')
  }

  const palermoBranch = tenant.branches.find(b => b.name === 'Sede Palermo')!
  const cortesCat = tenant.serviceCategories.find(c => c.name === 'Cortes')!
  const barbaCat = tenant.serviceCategories.find(c => c.name === 'Barbería')!

  const corteClasico = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      categoryId: cortesCat.id,
      name: 'Corte Clásico',
      duration: 45,
      price: 15000,
      color: '#4CAF50',
      active: true
    }
  })

  const arregloBarba = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      categoryId: barbaCat.id,
      name: 'Arreglo de Barba',
      duration: 30,
      price: 10000,
      color: '#FF9800',
      active: true
    }
  })

  console.log('🧔 Creando Profesionales (Messi y Dibu)...')
  await prisma.professional.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Leo',
      lastName: 'Messi',
      bio: 'Barbero Principal',
      color: '#2196F3',
      active: true,
      branches: { create: [{ branchId: palermoBranch.id }] },
      services: { create: [{ serviceId: corteClasico.id }, { serviceId: arregloBarba.id }] },
      availability: {
        create: [1, 2, 3, 4, 5].map(day => ({
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          branchId: palermoBranch.id
        }))
      }
    }
  })

  console.log('✅ Negocio de prueba creado con éxito.')
}

async function seedSuperAdmin() {
  console.log('🚀 Creando/Verificando Super Administrador del Sistema (system_users)...')
  const email = 'superadmin@axenda.com'
  const passwordHash = await bcrypt.hash('SuperAdminPass123!', 12)

  // Upsert en la tabla separada system_users (no en users de tenants)
  const existing = await prisma.systemUser.findUnique({ where: { email } })

  if (!existing) {
    await prisma.systemUser.create({
      data: {
        email,
        firstName: 'System',
        lastName: 'Administrator',
        passwordHash,
        active: true,
      },
    })
    console.log('✅ SystemUser SUPER_ADMIN creado en system_users.')
  } else {
    await prisma.systemUser.update({
      where: { email },
      data: { passwordHash, active: true },
    })
    console.log('✅ SystemUser SUPER_ADMIN verificado/actualizado en system_users.')
  }

  // Limpiar el User viejo con SUPER_ADMIN de la tabla de tenants (si existe de migración anterior)
  const oldSuperAdmin = await prisma.user.findFirst({
    where: { email, role: 'SUPER_ADMIN' },
  })
  if (oldSuperAdmin) {
    await prisma.user.delete({ where: { id: oldSuperAdmin.id } })
    console.log('🧹 User SUPER_ADMIN viejo eliminado de la tabla users.')

    // También limpiar el tenant ficticio "admin" si quedó sin usuarios
    const adminTenant = await prisma.tenant.findUnique({ where: { slug: 'admin' } })
    if (adminTenant) {
      const tenantUserCount = await prisma.user.count({ where: { tenantId: adminTenant.id } })
      if (tenantUserCount === 0) {
        await prisma.tenant.delete({ where: { id: adminTenant.id } })
        console.log('🧹 Tenant ficticio "admin" eliminado.')
      }
    }
  }
}

async function main() {
  if (DANGER_RESET) {
    console.log('⚠️  DANGER: Reseteando base de datos por completo...');
    // Borrar en orden inverso de dependencias
    await prisma.tenant.deleteMany({});
    await prisma.subscriptionPlan.deleteMany({});
    console.log('🧹 Base de datos limpia.');
  }

  // 1. Siempre sincronizar datos del sistema
  await seedSubscriptionPlans();
  await seedSuperAdmin();

  // 2. Opcionalmente sembrar datos de muestra
  if (WITH_SAMPLES) {
    await seedSampleBusiness();
  } else {
    console.log('ℹ️  Saltando datos de prueba. Usa --with-samples para incluirlos.');
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
