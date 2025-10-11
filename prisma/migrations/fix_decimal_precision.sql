-- Fix decimal precision for payments, booking_rooms, and extras tables

-- Drop the view temporarily
DROP VIEW IF EXISTS booking_payment_summary CASCADE;

-- Update payments table
ALTER TABLE payments 
ALTER COLUMN amount TYPE DECIMAL(12, 2);

-- Update booking_rooms table
ALTER TABLE booking_rooms 
ALTER COLUMN price TYPE DECIMAL(12, 2),
ALTER COLUMN discount TYPE DECIMAL(12, 2);

-- Update extras table
ALTER TABLE extras 
ALTER COLUMN price TYPE DECIMAL(12, 2);

-- Recreate the view (if it existed)
-- Note: You may need to recreate the view with the original definition
-- This will be handled by Prisma on the next schema sync

