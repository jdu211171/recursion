-- Migration script to transition from parent-child item model to aggregate count model
-- This script should be run after backing up the database

BEGIN;

-- Step 1: Add new columns to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS total_count INTEGER DEFAULT 1 CHECK (total_count >= 0),
ADD COLUMN IF NOT EXISTS available_count INTEGER DEFAULT 1 CHECK (available_count >= 0 AND available_count <= total_count);

-- Step 2: Add contact_info to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS contact_info VARCHAR(255);

-- Step 3: Add metadata columns for storing quantity information
ALTER TABLE lendings
ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 4: Migrate existing data
-- Count child items for each parent and update total_count
UPDATE items AS parent
SET total_count = COALESCE((
    SELECT COUNT(*) + 1 
    FROM items AS child 
    WHERE child.parent_item_id = parent.id
), 1)
WHERE parent.parent_item_id IS NULL;

-- Update available_count based on current availability
UPDATE items AS parent
SET available_count = COALESCE((
    SELECT COUNT(*) + CASE WHEN parent.is_available THEN 1 ELSE 0 END
    FROM items AS child 
    WHERE child.parent_item_id = parent.id 
    AND child.is_available = true
), CASE WHEN parent.is_available THEN 1 ELSE 0 END)
WHERE parent.parent_item_id IS NULL;

-- Step 5: Update lendings to reference parent items only
-- First, update lending records that reference child items to reference their parent
UPDATE lendings AS l
SET item_id = (
    SELECT COALESCE(parent_item_id, i.id)
    FROM items i
    WHERE i.id = l.item_id
)
WHERE EXISTS (
    SELECT 1 FROM items i
    WHERE i.id = l.item_id AND i.parent_item_id IS NOT NULL
);

-- Step 6: Update reservations to reference parent items only
UPDATE reservations AS r
SET item_id = (
    SELECT COALESCE(parent_item_id, i.id)
    FROM items i
    WHERE i.id = r.item_id
)
WHERE EXISTS (
    SELECT 1 FROM items i
    WHERE i.id = r.item_id AND i.parent_item_id IS NOT NULL
);

-- Step 7: Delete child items (after confirming parent items have correct counts)
DELETE FROM items WHERE parent_item_id IS NOT NULL;

-- Step 8: Drop the parent_item_id column and is_available column
ALTER TABLE items 
DROP COLUMN IF EXISTS parent_item_id,
DROP COLUMN IF EXISTS is_available;

-- Step 9: Create new indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_available ON items(org_id, instance_id, available_count) 
WHERE available_count > 0;

-- Step 10: Add CHECK constraint on file_metadata size if not exists
ALTER TABLE file_metadata
DROP CONSTRAINT IF EXISTS file_metadata_size_check;

ALTER TABLE file_metadata
ADD CONSTRAINT file_metadata_size_check CHECK (size > 0 AND size <= 26214400);

-- Step 11: Update Prisma migrations table to mark this as completed
-- This ensures Prisma knows about the manual migration
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    CONCAT('manual_', TO_CHAR(NOW(), 'YYYYMMDDHH24MISS')),
    'manual_migration_to_count_based_model',
    NOW(),
    CONCAT(TO_CHAR(NOW(), 'YYYYMMDDHH24MISS'), '_migrate_to_count_based_model'),
    'Manual migration from parent-child to count-based item model',
    NULL,
    NOW(),
    1
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verification queries (run these after migration to check results)
/*
-- Check items with counts
SELECT id, unique_id, name, total_count, available_count 
FROM items 
ORDER BY created_at DESC 
LIMIT 20;

-- Check for any orphaned lendings
SELECT l.id, l.item_id, i.id as item_exists
FROM lendings l
LEFT JOIN items i ON l.item_id = i.id
WHERE i.id IS NULL;

-- Check for any orphaned reservations
SELECT r.id, r.item_id, i.id as item_exists
FROM reservations r
LEFT JOIN items i ON r.item_id = i.id
WHERE i.id IS NULL;

-- Summary of items by organization
SELECT 
    o.name as org_name,
    COUNT(i.id) as item_count,
    SUM(i.total_count) as total_units,
    SUM(i.available_count) as available_units
FROM items i
JOIN organizations o ON i.org_id = o.id
GROUP BY o.id, o.name;
*/