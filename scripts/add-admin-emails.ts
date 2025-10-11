import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAdminProfiles() {
  try {
    console.log('Adding admin profiles...');

    // Add admin profiles - replace with actual admin information
    const adminProfiles = [
      { 
        name: 'Admin User',
        email: 'admin@amigoinn.com',
        role: 'admin' as const
      },
      { 
        name: 'Manager User',
        email: 'manager@amigoinn.com',
        role: 'admin' as const
      },
      // Add more admin profiles here
    ];

    for (const profile of adminProfiles) {
      await prisma.profile.upsert({
        where: { email: profile.email },
        update: {
          name: profile.name,
          role: profile.role,
        },
        create: {
          name: profile.name,
          email: profile.email,
          role: profile.role,
        },
      });
      console.log(`Added/Updated admin profile: ${profile.name} (${profile.email}) - Role: ${profile.role}`);
    }

    console.log('Admin profiles added successfully!');
  } catch (error) {
    console.error('Error adding admin profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAdminProfiles();
