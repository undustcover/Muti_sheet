import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const ownerEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    console.error('Admin user not found. Please run seed:dev first.');
    process.exit(1);
  }
  const projectName = process.env.SEED_PROJECT_NAME || 'Demo Project';
  const project = await prisma.project.create({
    data: { name: projectName, ownerId: owner.id, isAnonymousReadEnabled: false },
  });
  console.log('Seeded project:', { id: project.id, name: project.name, ownerId: project.ownerId });
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
});