-- Complete migration for booking_extras table
-- Run this in Supabase SQL Editor

-- Step 1: Drop the view that depends on booking_extras.deleted_at
DROP VIEW IF EXISTS booking_payment_summary;

-- Step 2: Add new columns to booking_extras
ALTER TABLE booking_extras 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2);

-- Step 3: Make extra_id nullable
ALTER TABLE booking_extras 
ALTER COLUMN extra_id DROP NOT NULL;

-- Step 4: For existing records, populate label and price from the extras table
UPDATE booking_extras be
SET 
  label = e.name,
  price = e.price
FROM extras e
WHERE be.extra_id = e.id
  AND be.label IS NULL;

-- Step 5: Set default values for any remaining NULL values
UPDATE booking_extras
SET 
  label = COALESCE(label, 'Custom Extra'),
  price = COALESCE(price, 0)
WHERE label IS NULL OR price IS NULL;

-- Step 6: Now make label and price NOT NULL
ALTER TABLE booking_extras 
ALTER COLUMN label SET NOT NULL,
ALTER COLUMN price SET NOT NULL;

-- Step 7: Recreate the booking_payment_summary view
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
GROUP BY b.id, b.guest_id, b.total_price, b.discount, b.status, b.proof_image_url, b.created_at, b.updated_at, b.deleted_at;

-- Step 8: Drop admin_emails table (since we're using profiles now)
DROP TABLE IF EXISTS admin_emails;

