import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function main() {
  // Create roles
  const roles = [
    {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with full access'
    },
    {
      name: 'SUB_ADMIN',
      description: 'Sub Administrator with limited access'
    },
    {
      name: 'LEADER',
      description: 'Team Leader with basic access'
    }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role
    });
  }

  // Create super admin user if not exists
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' }
  });

  if (superAdminRole) {
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: await encrypt('admin123'),
        name: 'Super Admin',
        roles: {
          connect: {
            id: superAdminRole.id
          }
        }
      }
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 