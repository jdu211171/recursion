-- Rollback script to revert from count-based model to parent-child model
-- WARNING: This is a complex rollback and may result in data loss
-- Only use if absolutely necessary and after backing up the database

BEGIN;

-- Step 1: Re-add the columns we removed
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES items(id),
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Step 2: Create index for parent_item_id
CREATE INDEX IF NOT EXISTS idx_items_parent_item_id ON items(parent_item_id);

-- Step 3: For each item with total_count > 1, create child items
DO $$
DECLARE
    parent_record RECORD;
    i INTEGER;
    new_item_id UUID;
BEGIN
    FOR parent_record IN 
        SELECT id, unique_id, name, description, category_id, org_id, instance_id, 
               total_count, available_count, metadata, created_at, updated_at
        FROM items 
        WHERE total_count > 1
    LOOP
        -- Create child items (total_count - 1 because parent counts as 1)
        FOR i IN 1..(parent_record.total_count - 1) LOOP
            new_item_id := uuid_generate_v4();
            
            INSERT INTO items (
                id, unique_id, name, description, category_id, 
                parent_item_id, org_id, instance_id, is_available, 
                metadata, created_at, updated_at, total_count, available_count
            ) VALUES (
                new_item_id,
                CONCAT(parent_record.unique_id, '-COPY-', i),
                CONCAT(parent_record.name, ' - Copy ', i + 1),
                parent_record.description,
                parent_record.category_id,
                parent_record.id, -- Set parent reference
                parent_record.org_id,
                parent_record.instance_id,
                i <= (parent_record.available_count - 1), -- Set availability based on count
                parent_record.metadata,
                parent_record.created_at,
                parent_record.updated_at,
                1, -- Child items have count of 1
                CASE WHEN i <= (parent_record.available_count - 1) THEN 1 ELSE 0 END
            );
        END LOOP;
        
        -- Update parent item
        UPDATE items 
        SET is_available = (available_count > 0),
            total_count = 1,
            available_count = CASE WHEN available_count > 0 THEN 1 ELSE 0 END
        WHERE id = parent_record.id;
    END LOOP;
END $$;

-- Step 4: Distribute lendings across child items
-- This is approximate - we assign lendings to unavailable child items
DO $$
DECLARE
    lending_record RECORD;
    available_child_id UUID;
BEGIN
    FOR lending_record IN 
        SELECT l.id, l.item_id
        FROM lendings l
        WHERE l.returned_at IS NULL
    LOOP
        -- Find an available child item for this lending
        SELECT id INTO available_child_id
        FROM items
        WHERE parent_item_id = lending_record.item_id
          AND is_available = false
        LIMIT 1;
        
        -- If found, update the lending to reference the child
        IF available_child_id IS NOT NULL THEN
            UPDATE lendings 
            SET item_id = available_child_id
            WHERE id = lending_record.id;
        END IF;
    END LOOP;
END $$;

-- Step 5: Update items that have no parent to have total_count = 1
UPDATE items 
SET total_count = 1,
    available_count = CASE WHEN is_available THEN 1 ELSE 0 END
WHERE parent_item_id IS NULL AND total_count != 1;

-- Step 6: Drop the new columns
ALTER TABLE items 
DROP COLUMN IF EXISTS total_count,
DROP COLUMN IF EXISTS available_count;

-- Step 7: Remove contact_info from users
ALTER TABLE users
DROP COLUMN IF EXISTS contact_info;

-- Step 8: Drop metadata columns
ALTER TABLE lendings
DROP COLUMN IF EXISTS metadata;

ALTER TABLE reservations
DROP COLUMN IF EXISTS metadata;

-- Step 9: Remove the new index
DROP INDEX IF EXISTS idx_items_available;

-- Step 10: Update Prisma migrations table
DELETE FROM _prisma_migrations 
WHERE migration_name LIKE '%migrate_to_count_based_model%';

COMMIT;

-- Verification queries
/*
-- Check parent items and their children
SELECT 
    p.id as parent_id,
    p.name as parent_name,
    COUNT(c.id) as child_count
FROM items p
LEFT JOIN items c ON c.parent_item_id = p.id
WHERE p.parent_item_id IS NULL
GROUP BY p.id, p.name
ORDER BY p.created_at DESC;

-- Check lending distribution
SELECT 
    i.name,
    i.is_available,
    COUNT(l.id) as active_lendings
FROM items i
LEFT JOIN lendings l ON l.item_id = i.id AND l.returned_at IS NULL
GROUP BY i.id, i.name, i.is_available
HAVING COUNT(l.id) > 0;
*/