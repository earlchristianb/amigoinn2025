-- ======================================================
-- 🔹 Add Soft Delete Fields & Update Schema
-- ======================================================
-- Run this SQL in your Supabase SQL Editor

-- Add deleted_at columns to all tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE booking_rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE extras ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE booking_extras ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_guests_deleted_at ON guests(deleted_at);
CREATE INDEX IF NOT EXISTS idx_room_types_deleted_at ON room_types(deleted_at);
CREATE INDEX IF NOT EXISTS idx_rooms_deleted_at ON rooms(deleted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_deleted_at ON booking_rooms(deleted_at);
CREATE INDEX IF NOT EXISTS idx_extras_deleted_at ON extras(deleted_at);
CREATE INDEX IF NOT EXISTS idx_booking_extras_deleted_at ON booking_extras(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);

-- Create indexes for created_at for better sorting performance
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON guests(created_at);
CREATE INDEX IF NOT EXISTS idx_room_types_created_at ON room_types(created_at);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_created_at ON booking_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_extras_created_at ON extras(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_extras_created_at ON booking_extras(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
