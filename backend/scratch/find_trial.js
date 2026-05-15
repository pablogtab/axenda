
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trialSub = await prisma.tenantSubscription.findFirst({
    where: { status: 'TRIALING' },
    include: { tenant: true }
  });

  if (!trialSub) {
    console.log('No trial subscription found to test.');
    return;
  }

  console.log('Testing with tenant:', trialSub.tenantId);
  console.log('Current status:', trialSub.status);

  // Note: We can't easily call the service method from here without Nest context
  // but we can check if our manual update logic works
}

main().finally(() => prisma.$disconnect());
