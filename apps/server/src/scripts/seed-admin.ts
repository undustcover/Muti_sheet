import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const email = 'admin@admin.com';
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: hash,
    },
    update: {
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: hash,
    },
  });

  console.log('Seeded admin user:', { id: user.id, email: user.email });
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
});