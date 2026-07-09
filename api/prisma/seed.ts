import { AccountStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@choninovet.local';
  const password = process.env.ADMIN_PASSWORD ?? 'Cambiar1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
      passwordHash,
    },
    create: {
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  console.log(`Admin listo: ${admin.email} (${admin.role})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
