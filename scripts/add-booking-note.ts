import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🚀 Adding note field to bookings table...');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS note TEXT
    `);

    console.log('✅ Note field added successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Restart your dev server if needed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();

