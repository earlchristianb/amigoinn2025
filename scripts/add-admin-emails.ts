import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAdminEmails() {
  try {
    console.log('Adding admin emails...');

    // Add admin emails - replace with actual admin emails
    const adminEmails = [
      'admin@amigoinn.com',
      'manager@amigoinn.com',
      // Add more admin emails here
    ];

    for (const email of adminEmails) {
      await prisma.profile.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: email.split('@')[0], // Use email prefix as name
        },
      });
      console.log(`Added admin email: ${email}`);
    }

    console.log('Admin emails added successfully!');
  } catch (error) {
    console.error('Error adding admin emails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAdminEmails();
