import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🚀 Adding package fields to extras table...');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE extras 
      ADD COLUMN IF NOT EXISTS is_package BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS included_nights INTEGER
    `);

    console.log('✅ Package fields added successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Update extras with package information');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();

