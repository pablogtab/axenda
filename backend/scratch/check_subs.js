
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.tenantSubscription.findMany({
    include: {
      tenant: true,
      plan: true
    }
  });
  console.log(JSON.stringify(subs, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
