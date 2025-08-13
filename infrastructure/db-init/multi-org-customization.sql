-- Additional tables for multi-organization customization support
-- These tables enable per-organization configurations and feature toggles

-- Organization configurations table
CREATE TABLE org_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    
    -- Lending configuration
    max_lending_days INTEGER DEFAULT 7,
    late_penalty_per_day DECIMAL(10,2) DEFAULT 1.00,
    max_items_per_user INTEGER DEFAULT 5,
    require_approval BOOLEAN DEFAULT FALSE,
    allow_extensions BOOLEAN DEFAULT TRUE,
    max_extensions INTEGER DEFAULT 2,
    auto_blacklist BOOLEAN DEFAULT TRUE,
    
    -- Blacklist thresholds (in days)
    blacklist_threshold_first INTEGER DEFAULT 3,
    blacklist_threshold_second INTEGER DEFAULT 7,
    blacklist_threshold_third INTEGER DEFAULT 30,
    
    -- UI/Branding configuration
    theme_config JSONB DEFAULT '{}', -- Store colors, logos, etc.
    enabled_features JSONB DEFAULT '[]', -- Array of feature flags
    custom_fields JSONB DEFAULT '{}', -- Custom form fields per org
    
    -- Email/Notification templates
    email_templates JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(org_id, instance_id)
);

CREATE INDEX idx_org_configurations_org_instance ON org_configurations(org_id, instance_id);

-- Feature flags table (defines available features)
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    default_enabled BOOLEAN DEFAULT FALSE,
    requires_role user_role,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default feature flags
INSERT INTO feature_flags (name, description, default_enabled, requires_role) VALUES
    ('csv_import_export', 'Bulk import/export via CSV', true, 'ADMIN'),
    ('advanced_reporting', 'Custom analytics dashboard', false, 'STAFF'),
    ('api_access', 'External API integration', false, 'ADMIN'),
    ('custom_workflows', 'Custom approval workflows', false, 'ADMIN'),
    ('mobile_app', 'Mobile app access', true, 'BORROWER'),
    ('email_notifications', 'Email notifications for due dates', true, 'BORROWER'),
    ('reservation_queue', 'Advanced reservation queue management', true, 'STAFF'),
    ('penalty_calculator', 'Custom penalty calculation rules', false, 'ADMIN');

-- Custom fields definition per organization
CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'item', 'user', 'lending', etc.
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'select', 'checkbox'
    field_config JSONB NOT NULL, -- Options for select, validation rules, etc.
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(org_id, entity_type, field_name)
);

CREATE INDEX idx_custom_field_definitions_org_entity ON custom_field_definitions(org_id, entity_type);

-- Audit log for tracking customization changes
CREATE TABLE customization_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id TEXT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customization_audit_log_org ON customization_audit_log(org_id);
CREATE INDEX idx_customization_audit_log_created ON customization_audit_log(created_at);

-- Add configuration version tracking for safe updates
ALTER TABLE organizations ADD COLUMN config_version INTEGER DEFAULT 1;
ALTER TABLE organizations ADD COLUMN deployment_type VARCHAR(50) DEFAULT 'shared'; -- 'shared', 'dedicated', 'self-hosted'

-- Create stored procedure for safe configuration updates
CREATE OR REPLACE FUNCTION update_org_configuration(
    p_org_id INTEGER,
    p_instance_id INTEGER,
    p_config JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO org_configurations (org_id, instance_id)
    VALUES (p_org_id, p_instance_id)
    ON CONFLICT (org_id, instance_id) 
    DO UPDATE SET
        max_lending_days = COALESCE((p_config->>'max_lending_days')::INTEGER, org_configurations.max_lending_days),
        late_penalty_per_day = COALESCE((p_config->>'late_penalty_per_day')::DECIMAL, org_configurations.late_penalty_per_day),
        max_items_per_user = COALESCE((p_config->>'max_items_per_user')::INTEGER, org_configurations.max_items_per_user),
        require_approval = COALESCE((p_config->>'require_approval')::BOOLEAN, org_configurations.require_approval),
        allow_extensions = COALESCE((p_config->>'allow_extensions')::BOOLEAN, org_configurations.allow_extensions),
        max_extensions = COALESCE((p_config->>'max_extensions')::INTEGER, org_configurations.max_extensions),
        auto_blacklist = COALESCE((p_config->>'auto_blacklist')::BOOLEAN, org_configurations.auto_blacklist),
        blacklist_threshold_first = COALESCE((p_config->>'blacklist_threshold_first')::INTEGER, org_configurations.blacklist_threshold_first),
        blacklist_threshold_second = COALESCE((p_config->>'blacklist_threshold_second')::INTEGER, org_configurations.blacklist_threshold_second),
        blacklist_threshold_third = COALESCE((p_config->>'blacklist_threshold_third')::INTEGER, org_configurations.blacklist_threshold_third),
        theme_config = COALESCE(p_config->'theme_config', org_configurations.theme_config),
        enabled_features = COALESCE(p_config->'enabled_features', org_configurations.enabled_features),
        custom_fields = COALESCE(p_config->'custom_fields', org_configurations.custom_fields),
        email_templates = COALESCE(p_config->'email_templates', org_configurations.email_templates),
        updated_at = CURRENT_TIMESTAMP;
        
    -- Update organization version
    UPDATE organizations 
    SET config_version = config_version + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy access to organization settings
CREATE VIEW org_settings AS
SELECT 
    o.id as org_id,
    o.name as org_name,
    o.deployment_type,
    o.config_version,
    i.id as instance_id,
    i.name as instance_name,
    COALESCE(oc.max_lending_days, 7) as max_lending_days,
    COALESCE(oc.late_penalty_per_day, 1.00) as late_penalty_per_day,
    COALESCE(oc.max_items_per_user, 5) as max_items_per_user,
    COALESCE(oc.require_approval, false) as require_approval,
    COALESCE(oc.allow_extensions, true) as allow_extensions,
    COALESCE(oc.max_extensions, 2) as max_extensions,
    COALESCE(oc.auto_blacklist, true) as auto_blacklist,
    COALESCE(oc.blacklist_threshold_first, 3) as blacklist_threshold_first,
    COALESCE(oc.blacklist_threshold_second, 7) as blacklist_threshold_second,
    COALESCE(oc.blacklist_threshold_third, 30) as blacklist_threshold_third,
    COALESCE(oc.theme_config, '{}'::jsonb) as theme_config,
    COALESCE(oc.enabled_features, '[]'::jsonb) as enabled_features,
    COALESCE(oc.custom_fields, '{}'::jsonb) as custom_fields,
    COALESCE(oc.email_templates, '{}'::jsonb) as email_templates
FROM organizations o
LEFT JOIN instances i ON i.org_id = o.id
LEFT JOIN org_configurations oc ON oc.org_id = o.id AND (oc.instance_id = i.id OR oc.instance_id IS NULL);

-- Trigger to maintain audit log
CREATE OR REPLACE FUNCTION audit_configuration_change() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customization_audit_log (
        org_id, 
        user_id, 
        action, 
        entity_type, 
        entity_id, 
        old_value, 
        new_value
    ) VALUES (
        NEW.org_id,
        current_setting('app.current_user_id', true)::UUID,
        TG_OP,
        'configuration',
        NEW.id,
        row_to_json(OLD)::jsonb,
        row_to_json(NEW)::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_org_config_changes
    AFTER UPDATE ON org_configurations
    FOR EACH ROW
    EXECUTE FUNCTION audit_configuration_change();

-- Example: Setting up a customized organization
-- INSERT INTO org_configurations (org_id, max_lending_days, theme_config, enabled_features)
-- VALUES (
--     1, 
--     14, 
--     '{"primaryColor": "#FF5733", "logo": "https://example.com/logo.png"}',
--     '["advanced_reporting", "api_access"]'
-- );