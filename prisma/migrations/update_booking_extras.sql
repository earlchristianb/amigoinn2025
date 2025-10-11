-- Add label and price columns to booking_extras table
-- Make extra_id nullable to support legacy/custom extras

-- Add new columns
ALTER TABLE booking_extras 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2);

-- Make extra_id nullable
ALTER TABLE booking_extras 
ALTER COLUMN extra_id DROP NOT NULL;

-- For existing records, populate label and price from the extras table
UPDATE booking_extras be
SET 
  label = e.name,
  price = e.price
FROM extras e
WHERE be.extra_id = e.id
  AND be.label IS NULL;

-- Set default values for any remaining NULL values
UPDATE booking_extras
SET 
  label = 'Custom Extra',
  price = 0
WHERE label IS NULL;

-- Now make label and price NOT NULL
ALTER TABLE booking_extras 
ALTER COLUMN label SET NOT NULL,
ALTER COLUMN price SET NOT NULL;

