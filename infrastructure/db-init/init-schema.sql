-- Multi-tenant schema for Borrowing/Lending System
-- Updated with aggregate quantity tracking and improved constraints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (top-level tenants)
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instances table (sub-tenants)
CREATE TABLE instances (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_instances_org_id ON instances(org_id);

-- User roles enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF', 'BORROWER');

-- Users table with contact info
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    contact_info VARCHAR(255), -- Phone/email for follow-up
    role user_role DEFAULT 'BORROWER',
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id INTEGER REFERENCES instances(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_org_instance ON users(org_id, instance_id);
CREATE INDEX idx_users_email ON users(email);

-- Refresh tokens for JWT authentication
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Categories for organizing items
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id INTEGER REFERENCES instances(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, org_id, instance_id)
);

CREATE INDEX idx_categories_org_instance ON categories(org_id, instance_id);

-- Items table with aggregate quantity tracking
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unique_id VARCHAR(255) UNIQUE NOT NULL, -- Barcode, ISBN, etc.
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id INTEGER REFERENCES instances(id) ON DELETE SET NULL,
    total_count INTEGER DEFAULT 1 CHECK (total_count >= 0),
    available_count INTEGER DEFAULT 1 CHECK (available_count >= 0 AND available_count <= total_count),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_org_instance ON items(org_id, instance_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_items_unique_id ON items(unique_id);
CREATE INDEX idx_items_available ON items(org_id, instance_id, available_count) WHERE available_count > 0;

-- Lendings table for tracking borrowed items
CREATE TABLE lendings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id INTEGER REFERENCES instances(id) ON DELETE SET NULL,
    borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    returned_at TIMESTAMP,
    penalty DECIMAL(10,2) DEFAULT 0,
    penalty_reason VARCHAR(255),
    penalty_override BOOLEAN DEFAULT FALSE,
    notes TEXT,
    metadata JSONB, -- Stores quantity and other lending data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lendings_item_id ON lendings(item_id);
CREATE INDEX idx_lendings_user_id ON lendings(user_id);
CREATE INDEX idx_lendings_org_instance ON lendings(org_id, instance_id);
CREATE INDEX idx_lendings_returned_at ON lendings(returned_at);

-- Reservation status enum
CREATE TYPE reservation_status AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- Reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id INTEGER REFERENCES instances(id) ON DELETE SET NULL,
    reserved_for TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    status reservation_status DEFAULT 'ACTIVE',
    fulfilled_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    notes TEXT,
    metadata JSONB, -- Stores quantity and other reservation data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_item_id ON reservations(item_id);
CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_org_instance ON reservations(org_id, instance_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_reserved_for ON reservations(reserved_for);

-- Blacklists table for user restrictions
CREATE TABLE blacklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id INTEGER REFERENCES instances(id) ON DELETE SET NULL,
    reason VARCHAR(255) NOT NULL,
    blocked_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    overridden_by UUID REFERENCES users(id),
    overridden_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blacklists_user_org_instance ON blacklists(user_id, org_id, instance_id);
CREATE INDEX idx_blacklists_blocked_until ON blacklists(blocked_until);
CREATE INDEX idx_blacklists_is_active ON blacklists(is_active);

-- File metadata table
CREATE TABLE file_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    size INTEGER NOT NULL CHECK (size > 0 AND size <= 26214400), -- Max 25MB
    bucket VARCHAR(255) NOT NULL,
    object_name VARCHAR(255) NOT NULL,
    uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id INTEGER REFERENCES instances(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_metadata_item_id ON file_metadata(item_id);
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);
CREATE INDEX idx_file_metadata_org_instance ON file_metadata(org_id, instance_id);

-- Insert initial test data
INSERT INTO organizations (name) VALUES 
  ('City University Library'),
  ('Test Organization 2');

INSERT INTO instances (name, org_id) VALUES 
  ('Main Library', 1),
  ('Science Library', 1),
  ('Equipment Instance', 2);

-- Insert initial admin user
-- Password is 'admin123' (you should change this immediately)
INSERT INTO users (email, password, first_name, last_name, role, org_id, instance_id) VALUES 
  ('admin@cityuniversitylibrary.com', '$2b$10$YourHashedPasswordHere', 'System', 'Administrator', 'ADMIN', 1, 1);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lendings_updated_at BEFORE UPDATE ON lendings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blacklists_updated_at BEFORE UPDATE ON blacklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at BEFORE UPDATE ON file_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();