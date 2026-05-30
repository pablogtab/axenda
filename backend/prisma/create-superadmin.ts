import { PrismaClient, UserRole, AuthProvider } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: resolve(__dirname, '../.env'), override: true });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2] || 'superadmin@axenda.com';
  const password = process.argv[3] || 'SuperAdminPass123!';
  const hashedPassword = await bcrypt.hash(password, 12);

  console.log(`🚀 Creating SUPER_ADMIN with email: ${email}...`);

  // 1. Create or get administrative tenant
  let adminTenant = await prisma.tenant.findUnique({
    where: { slug: 'admin' },
  });

  if (!adminTenant) {
    adminTenant = await prisma.tenant.create({
      data: {
        name: 'Axenda System Admin',
        slug: 'admin',
        publicSlug: 'admin',
        email: email,
        active: true,
        onboardingCompleted: true,
      },
    });
    console.log('✅ Created administrative tenant (slug: admin).');
  } else {
    console.log('ℹ️ Administrative tenant (slug: admin) already exists.');
  }

  // 2. Create or update SUPER_ADMIN user
  let user = await prisma.user.findFirst({
    where: {
      email,
      tenantId: adminTenant.id,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        tenantId: adminTenant.id,
        role: UserRole.SUPER_ADMIN,
        firstName: 'System',
        lastName: 'Administrator',
        active: true,
        identities: {
          create: {
            provider: AuthProvider.EMAIL,
            providerId: email,
            passwordHash: hashedPassword,
          },
        },
      },
    });
    console.log('✅ Created SUPER_ADMIN user successfully.');
  } else {
    // Promote user to SUPER_ADMIN if not already
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: UserRole.SUPER_ADMIN,
        active: true,
      },
    });

    // Update password
    const identity = await prisma.userIdentity.findFirst({
      where: { userId: user.id, provider: AuthProvider.EMAIL },
    });

    if (identity) {
      await prisma.userIdentity.update({
        where: { id: identity.id },
        data: { passwordHash: hashedPassword },
      });
    } else {
      await prisma.userIdentity.create({
        data: {
          userId: user.id,
          provider: AuthProvider.EMAIL,
          providerId: email,
          passwordHash: hashedPassword,
        },
      });
    }

    console.log('✅ Updated SUPER_ADMIN password and promoted to SUPER_ADMIN role.');
  }

  console.log('✨ Super Admin setup completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error creating super admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
