-- Fix lending_policies table to match Prisma schema and application expectations
-- This adds missing columns that the application code expects

-- Check if user_role type exists, create if not
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF', 'BORROWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to lending_policies table
ALTER TABLE lending_policies 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS item_category VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_role user_role,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS penalty_rules JSONB,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add aliases/views for column mapping if needed
-- The application expects max_days and max_items, but we have max_lending_days and max_items_per_user
-- We can handle this mapping in the application code instead

-- Add index for priority column
CREATE INDEX IF NOT EXISTS idx_lending_policies_priority ON lending_policies(priority);

-- Update existing records to have sensible defaults
UPDATE lending_policies 
SET 
    name = 'Default Policy',
    description = 'Standard lending policy for all users',
    penalty_rules = '{"latePerDay": 1.0, "lost": 50.0}'::jsonb,
    priority = 0,
    is_active = true
WHERE name IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'lending_policies' 
ORDER BY ordinal_position;