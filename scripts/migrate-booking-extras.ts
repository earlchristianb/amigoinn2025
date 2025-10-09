import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🚀 Starting booking_extras migration...');

    // Step 1: Drop the view
    console.log('📋 Step 1: Dropping booking_payment_summary view...');
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS booking_payment_summary`);
    console.log('✅ View dropped');

    // Step 2: Add new columns
    console.log('📋 Step 2: Adding label and price columns...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE booking_extras 
      ADD COLUMN IF NOT EXISTS label TEXT,
      ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2)
    `);
    console.log('✅ Columns added');

    // Step 3: Make extra_id nullable
    console.log('📋 Step 3: Making extra_id nullable...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE booking_extras 
      ALTER COLUMN extra_id DROP NOT NULL
    `);
    console.log('✅ extra_id is now nullable');

    // Step 4: Populate from extras table
    console.log('📋 Step 4: Populating label and price from extras table...');
    await prisma.$executeRawUnsafe(`
      UPDATE booking_extras be
      SET 
        label = e.name,
        price = e.price
      FROM extras e
      WHERE be.extra_id = e.id
        AND be.label IS NULL
    `);
    console.log('✅ Data populated from extras');

    // Step 5: Set defaults for remaining nulls
    console.log('📋 Step 5: Setting default values...');
    await prisma.$executeRawUnsafe(`
      UPDATE booking_extras
      SET 
        label = COALESCE(label, 'Custom Extra'),
        price = COALESCE(price, 0)
      WHERE label IS NULL OR price IS NULL
    `);
    console.log('✅ Default values set');

    // Step 6: Make columns NOT NULL
    console.log('📋 Step 6: Making label and price NOT NULL...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE booking_extras 
      ALTER COLUMN label SET NOT NULL,
      ALTER COLUMN price SET NOT NULL
    `);
    console.log('✅ Constraints applied');

    // Step 7: Recreate the view
    console.log('📋 Step 7: Recreating booking_payment_summary view...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW booking_payment_summary AS
      SELECT 
        b.id,
        b.guest_id,
        b.total_price,
        b.discount,
        b.status,
        b.proof_image_url,
        b.created_at,
        b.updated_at,
        b.deleted_at,
        COALESCE(SUM(p.amount), 0) AS total_paid,
        (b.total_price - COALESCE(b.discount, 0) - COALESCE(SUM(p.amount), 0)) AS remaining_balance,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= (b.total_price - COALESCE(b.discount, 0)) THEN 'fully_paid'
          WHEN COALESCE(SUM(p.amount), 0) > 0 THEN 'partially_paid'
          ELSE 'unpaid'
        END AS payment_status
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id AND p.deleted_at IS NULL
      WHERE b.deleted_at IS NULL
      GROUP BY b.id, b.guest_id, b.total_price, b.discount, b.status, b.proof_image_url, b.created_at, b.updated_at, b.deleted_at
    `);
    console.log('✅ View recreated');

    // Step 8: Drop admin_emails table
    console.log('📋 Step 8: Dropping admin_emails table...');
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS admin_emails`);
    console.log('✅ admin_emails table dropped');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Restart your dev server: npm run dev');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();

