-- Seed data for City University Library
-- This script adds categories and sample items for a library system

-- Get the org_id for City University Library (from the previous query we know it's 10)
DO $$
DECLARE
    v_org_id INTEGER;
    v_instance_id INTEGER;
BEGIN
    -- Get the organization ID
    SELECT id INTO v_org_id FROM organizations WHERE name LIKE '%City University%' LIMIT 1;
    
    -- Get the first instance for this org
    SELECT id INTO v_instance_id FROM instances WHERE org_id = v_org_id LIMIT 1;
    
    -- Insert categories if they don't exist
    INSERT INTO categories (id, name, description, org_id, instance_id) 
    VALUES 
        (uuid_generate_v4(), 'Books', 'Physical and digital books', v_org_id, v_instance_id),
        (uuid_generate_v4(), 'Journals', 'Academic journals and periodicals', v_org_id, v_instance_id),
        (uuid_generate_v4(), 'DVDs', 'Educational and entertainment DVDs', v_org_id, v_instance_id),
        (uuid_generate_v4(), 'Equipment', 'Laptops, projectors, and other equipment', v_org_id, v_instance_id),
        (uuid_generate_v4(), 'Study Rooms', 'Bookable study spaces', v_org_id, v_instance_id)
    ON CONFLICT (name, org_id, instance_id) DO NOTHING;
    
    -- Insert sample items
    WITH book_category AS (
        SELECT id FROM categories WHERE name = 'Books' AND org_id = v_org_id LIMIT 1
    ),
    equipment_category AS (
        SELECT id FROM categories WHERE name = 'Equipment' AND org_id = v_org_id LIMIT 1
    )
    INSERT INTO items (id, unique_id, name, description, category_id, org_id, instance_id, total_count, available_count, metadata)
    VALUES 
        (uuid_generate_v4(), 'ISBN-9780134685991', 'Effective Java (3rd Edition)', 'By Joshua Bloch - The definitive guide to Java programming', (SELECT id FROM book_category), v_org_id, v_instance_id, 5, 5, '{"author": "Joshua Bloch", "year": 2018, "publisher": "Addison-Wesley"}'),
        (uuid_generate_v4(), 'ISBN-9780596009205', 'Head First Design Patterns', 'By Eric Freeman & Elisabeth Robson', (SELECT id FROM book_category), v_org_id, v_instance_id, 3, 3, '{"author": "Eric Freeman", "year": 2004, "publisher": "OReilly"}'),
        (uuid_generate_v4(), 'LAPTOP-001', 'Dell Latitude 5520', '15.6" Business Laptop with charger', (SELECT id FROM equipment_category), v_org_id, v_instance_id, 10, 10, '{"specs": "Intel i5, 16GB RAM, 512GB SSD", "accessories": ["charger", "mouse"]}'),
        (uuid_generate_v4(), 'PROJ-001', 'Epson PowerLite Projector', 'Portable projector for presentations', (SELECT id FROM equipment_category), v_org_id, v_instance_id, 3, 3, '{"resolution": "1920x1080", "lumens": 3200}')
    ON CONFLICT (unique_id) DO NOTHING;
    
    -- Add organization configuration
    INSERT INTO org_configurations (
        id,
        org_id, 
        max_lending_days, 
        late_penalty_per_day, 
        max_items_per_user,
        require_approval,
        allow_extensions,
        max_extensions,
        auto_blacklist,
        blacklist_threshold_first,
        blacklist_threshold_second,
        blacklist_threshold_third
    ) VALUES (
        uuid_generate_v4(),
        v_org_id,
        14,          -- 2 weeks default lending
        1.00,        -- $1 per day late fee
        5,           -- Max 5 items per user
        false,       -- No approval required
        true,        -- Allow extensions
        2,           -- Max 2 extensions
        true,        -- Auto blacklist enabled
        3,           -- Warning after 3 days
        7,           -- First blacklist after 7 days
        30           -- Final blacklist after 30 days
    )
    ON CONFLICT (org_id, instance_id) WHERE instance_id IS NULL DO NOTHING;
    
    RAISE NOTICE 'Seed data created for organization ID: %', v_org_id;
END $$;