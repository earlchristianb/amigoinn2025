-- ======================================================
-- 🔹 Setup Profile-Based Authentication
-- ======================================================
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Create ProfileRole enum if not exists
DO $$ BEGIN
  CREATE TYPE "ProfileRole" AS ENUM ('admin', 'assistant');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create BookingStatus enum if not exists
DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('pending', 'checked_in', 'checked_out', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Add deleted_at to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Step 3: Update profiles table to use enum for role (if it's currently a string)
-- First, check if role column exists and is a string
DO $$ 
BEGIN
  -- Add new role_enum column temporarily
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_enum "ProfileRole" DEFAULT 'assistant';
  
  -- Copy data from role to role_enum, mapping string values to enum
  UPDATE profiles SET role_enum = 
    CASE 
      WHEN role = 'admin' THEN 'admin'::"ProfileRole"
      ELSE 'assistant'::"ProfileRole"
    END
  WHERE role_enum IS NULL OR role IS NOT NULL;
  
  -- Drop old role column if it exists as string
  ALTER TABLE profiles DROP COLUMN IF EXISTS role CASCADE;
  
  -- Rename role_enum to role
  ALTER TABLE profiles RENAME COLUMN role_enum TO role;
EXCEPTION
  WHEN OTHERS THEN
    -- If role column doesn't exist or is already enum, just ensure it exists
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role "ProfileRole" DEFAULT 'assistant';
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Step 5: Insert sample admin profiles (update with your actual admin emails)
INSERT INTO profiles (name, email, role, created_at, updated_at)
VALUES 
  ('Admin User', 'admin@amigoinn.com', 'admin', NOW(), NOW()),
  ('Manager User', 'manager@amigoinn.com', 'admin', NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  role = EXCLUDED.role,
  updated_at = NOW();

-- Step 6: You can now safely drop admin_emails table if you want
-- DROP TABLE IF EXISTS admin_emails;

-- ======================================================
-- 🔹 Verification Queries
-- ======================================================
-- Run these to verify the setup:

-- Check all admin profiles
-- SELECT * FROM profiles WHERE deleted_at IS NULL ORDER BY created_at DESC;

-- Check specific admin
-- SELECT * FROM profiles WHERE email = 'your-email@example.com' AND deleted_at IS NULL;
