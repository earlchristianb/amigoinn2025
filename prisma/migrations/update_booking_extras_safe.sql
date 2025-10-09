-- Safe migration for booking_extras table
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns to booking_extras
ALTER TABLE booking_extras 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2);

-- Step 2: Make extra_id nullable
ALTER TABLE booking_extras 
ALTER COLUMN extra_id DROP NOT NULL;

-- Step 3: For existing records, populate label and price from the extras table
UPDATE booking_extras be
SET 
  label = e.name,
  price = e.price
FROM extras e
WHERE be.extra_id = e.id
  AND be.label IS NULL;

-- Step 4: Set default values for any remaining NULL values
UPDATE booking_extras
SET 
  label = COALESCE(label, 'Custom Extra'),
  price = COALESCE(price, 0)
WHERE label IS NULL OR price IS NULL;

-- Step 5: Now make label and price NOT NULL
ALTER TABLE booking_extras 
ALTER COLUMN label SET NOT NULL,
ALTER COLUMN price SET NOT NULL;

-- Optional: Drop admin_emails table if you're sure you don't need it
-- (Only uncomment if you've fully migrated to using profiles table)
-- DROP TABLE IF EXISTS admin_emails;

