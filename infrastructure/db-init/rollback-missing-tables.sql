-- Rollback script for add-missing-tables.sql migration
-- This script removes all the tables added in the migration

-- ==================== DROP TRIGGERS ====================

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
DROP TRIGGER IF EXISTS update_lending_policies_updated_at ON lending_policies;
DROP TRIGGER IF EXISTS update_approval_workflows_updated_at ON approval_workflows;

-- ==================== DROP SYSTEM OPERATION TABLES ====================

DROP TABLE IF EXISTS background_jobs CASCADE;
DROP TABLE IF EXISTS email_queue CASCADE;
DROP TABLE IF EXISTS system_notifications CASCADE;

-- ==================== DROP AUDIT & LOGGING TABLES ====================

DROP TABLE IF EXISTS item_history CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;

-- ==================== DROP BUSINESS LOGIC TABLES ====================

DROP TABLE IF EXISTS approval_workflows CASCADE;
DROP TABLE IF EXISTS lending_policies CASCADE;

-- ==================== DROP AUTHENTICATION TABLES ====================

DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Note: We don't drop the trigger functions as they might be used elsewhere