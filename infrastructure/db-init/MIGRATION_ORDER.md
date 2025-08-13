# Database Migration Order Guide

This document outlines the correct order for running database migrations to achieve the complete schema.

## Fresh Installation

For a fresh database installation, run the following scripts in order:

1. **init-schema.sql** - Creates the base schema with core tables
2. **migrate-to-count-based.sql** - Updates to aggregate quantity tracking (if not already in init-schema)
3. **multi-org-customization.sql** - Adds multi-organization configuration tables
4. **add-missing-tables.sql** - Adds authentication, system operations, and audit tables

```bash
# Example command sequence (adjust for your database connection):
psql -h localhost -U postgres -d your_database -f init-schema.sql
psql -h localhost -U postgres -d your_database -f migrate-to-count-based.sql
psql -h localhost -U postgres -d your_database -f multi-org-customization.sql
psql -h localhost -U postgres -d your_database -f add-missing-tables.sql
```

## Existing Database Update

For databases already running the system:

1. Check current schema version:
```sql
-- Check if you have the count-based schema
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'items' AND column_name IN ('total_count', 'available_count');

-- Check if you have multi-org configuration
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'org_configurations'
);

-- Check if you have the new auth/system tables
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_sessions'
);
```

2. Apply only the migrations you need:
   - If missing count-based fields: Run `migrate-to-count-based.sql`
   - If missing org_configurations: Run `multi-org-customization.sql`
   - If missing user_sessions: Run `add-missing-tables.sql`

## Rollback Scripts

Each migration has a corresponding rollback script:

- `rollback-count-based.sql` - Reverts to parent-child item relationships
- `rollback-missing-tables.sql` - Removes auth/system/audit tables

⚠️ **Warning**: The multi-org-customization.sql doesn't have a rollback script yet. Create one if needed.

## Complete Schema Tables

After all migrations, your database should have these tables:

### Core Tables
- organizations
- instances
- users
- refresh_tokens
- categories
- items
- lendings
- reservations
- blacklists
- file_metadata

### Configuration Tables (from multi-org-customization.sql)
- org_configurations
- feature_flags
- custom_field_definitions
- customization_audit_log

### Authentication & Security Tables (from add-missing-tables.sql)
- user_sessions
- password_reset_tokens
- user_preferences
- api_keys

### Business Logic Tables (from add-missing-tables.sql)
- lending_policies
- approval_workflows

### Audit & Logging Tables (from add-missing-tables.sql)
- user_activity_logs
- item_history

### System Operation Tables (from add-missing-tables.sql)
- system_notifications
- email_queue
- background_jobs

## Verification

After running migrations, verify the schema:

```sql
-- Count tables
SELECT COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Should return 26 tables after all migrations

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

## Docker Deployment

For Docker deployments, ensure the init script runs all migrations:

```bash
#!/bin/bash
# infrastructure/db-init/docker-init.sh

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    \i /docker-entrypoint-initdb.d/init-schema.sql
    \i /docker-entrypoint-initdb.d/migrate-to-count-based.sql
    \i /docker-entrypoint-initdb.d/multi-org-customization.sql
    \i /docker-entrypoint-initdb.d/add-missing-tables.sql
EOSQL
```

## Notes

- Always backup your database before running migrations
- Test migrations in a development environment first
- The migrations are idempotent (safe to run multiple times) due to IF NOT EXISTS clauses
- Monitor the migration output for any errors or warnings