-- Migration script to add missing tables for complete system functionality
-- This includes authentication, system operations, audit, and business logic tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== AUTHENTICATION TABLES ====================

-- User sessions for tracking active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_sessions_token (token),
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_expires_at (expires_at)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_password_reset_tokens_token (token),
    INDEX idx_password_reset_tokens_user_id (user_id)
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    key VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    org_id INTEGER REFERENCES organizations(id),
    permissions JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_api_keys_key (key),
    INDEX idx_api_keys_user_id (user_id)
);

-- ==================== BUSINESS LOGIC TABLES ====================

-- Lending policies for configurable rules
CREATE TABLE IF NOT EXISTS lending_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id INTEGER REFERENCES organizations(id),
    instance_id INTEGER REFERENCES instances(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    item_category VARCHAR(255),
    user_role user_role,
    max_days INTEGER NOT NULL,
    max_items INTEGER NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    penalty_rules JSONB NOT NULL DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_lending_policies_org_instance (org_id, instance_id),
    INDEX idx_lending_policies_priority (priority)
);

-- Approval workflows for items requiring approval
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id),
    user_id UUID REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    org_id INTEGER REFERENCES organizations(id),
    type VARCHAR(50) NOT NULL, -- 'lending', 'extension', etc.
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
    request_data JSONB NOT NULL,
    approver_notes TEXT,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_approval_workflows_status (status),
    INDEX idx_approval_workflows_org_id (org_id)
);

-- ==================== AUDIT & LOGGING TABLES ====================

-- User activity logs for tracking all actions
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    org_id INTEGER REFERENCES organizations(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_activity_logs_user_id (user_id),
    INDEX idx_user_activity_logs_org_id (org_id),
    INDEX idx_user_activity_logs_action (action),
    INDEX idx_user_activity_logs_created_at (created_at)
);

-- Item history for tracking changes
CREATE TABLE IF NOT EXISTS item_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'borrowed', 'returned', etc.
    changes JSONB, -- What changed
    metadata JSONB, -- Additional context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_item_history_item_id (item_id),
    INDEX idx_item_history_created_at (created_at)
);

-- ==================== SYSTEM OPERATION TABLES ====================

-- System notifications for in-app notifications
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    org_id INTEGER REFERENCES organizations(id),
    instance_id INTEGER REFERENCES instances(id),
    type VARCHAR(50) NOT NULL, -- 'due_reminder', 'overdue', 'reservation_ready', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB, -- Additional data (item details, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_system_notifications_user_read (user_id, is_read),
    INDEX idx_system_notifications_created_at (created_at)
);

-- Email queue for outgoing emails
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    template VARCHAR(100),
    template_data JSONB,
    org_id INTEGER REFERENCES organizations(id),
    instance_id INTEGER REFERENCES instances(id),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SENT, FAILED, CANCELLED
    attempts INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    error TEXT,
    scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email_queue_status_scheduled (status, scheduled_for),
    INDEX idx_email_queue_org_id (org_id)
);

-- Background jobs for scheduled tasks
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL, -- 'check_overdue', 'expire_reservations', etc.
    payload JSONB,
    org_id INTEGER REFERENCES organizations(id),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    error TEXT,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_background_jobs_status_scheduled (status, scheduled_for),
    INDEX idx_background_jobs_type (type)
);

-- ==================== INDEXES FOR PERFORMANCE ====================

-- Additional performance indexes if not already created
CREATE INDEX IF NOT EXISTS idx_users_org_instance ON users(org_id, instance_id);
CREATE INDEX IF NOT EXISTS idx_items_available ON items(org_id, instance_id, available_count) WHERE available_count > 0;
CREATE INDEX IF NOT EXISTS idx_lendings_active ON lendings(org_id, instance_id, returned_at) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_active ON reservations(org_id, instance_id, status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_blacklists_active ON blacklists(user_id, org_id, instance_id, is_active) WHERE is_active = TRUE;

-- ==================== TRIGGER FUNCTIONS ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lending_policies_updated_at BEFORE UPDATE ON lending_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log user activities
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log for specific tables and operations
    IF TG_TABLE_NAME IN ('items', 'lendings', 'reservations', 'users') THEN
        INSERT INTO user_activity_logs (
            user_id,
            org_id,
            action,
            entity_type,
            entity_id,
            metadata,
            created_at
        ) VALUES (
            current_setting('app.current_user_id', true)::UUID,
            COALESCE(NEW.org_id, OLD.org_id),
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id)::TEXT::UUID,
            jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW)
            ),
            CURRENT_TIMESTAMP
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply activity logging triggers (optional - can be enabled selectively)
-- CREATE TRIGGER log_items_activity AFTER INSERT OR UPDATE OR DELETE ON items
--     FOR EACH ROW EXECUTE FUNCTION log_user_activity();

-- ==================== DEFAULT DATA ====================

-- Insert default lending policies
INSERT INTO lending_policies (org_id, name, description, max_days, max_items, penalty_rules) 
SELECT 
    o.id,
    'Default Policy',
    'Standard lending policy for all users',
    7,
    5,
    '{"late_penalty_per_day": 1.0, "lost_item_penalty": 50.0}'::jsonb
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM lending_policies lp WHERE lp.org_id = o.id AND lp.name = 'Default Policy'
);

-- Create background job for checking overdue items (runs daily)
INSERT INTO background_jobs (type, payload, org_id, status, scheduled_for)
SELECT 
    'check_overdue_items',
    '{"recurring": true, "interval": "daily"}'::jsonb,
    o.id,
    'PENDING',
    CURRENT_DATE + INTERVAL '1 day'
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM background_jobs bj 
    WHERE bj.org_id = o.id 
    AND bj.type = 'check_overdue_items'
    AND bj.status IN ('PENDING', 'RUNNING')
);

-- Create notification for admins about new tables
INSERT INTO system_notifications (user_id, org_id, type, title, message)
SELECT 
    u.id,
    u.org_id,
    'system_update',
    'System Update: New Features Available',
    'The system has been updated with new features including enhanced user management, activity logging, and notification systems.'
FROM users u
WHERE u.role = 'ADMIN'
AND NOT EXISTS (
    SELECT 1 FROM system_notifications sn 
    WHERE sn.user_id = u.id 
    AND sn.type = 'system_update'
    AND sn.created_at > CURRENT_DATE
);

-- ==================== PERMISSIONS & SECURITY ====================

-- Ensure proper permissions on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;