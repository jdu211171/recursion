# Multi-Organization Customization Implementation Guide

## Overview

This guide explains how to implement and manage customizations for different organizations while maintaining a shared core codebase. The system supports both configuration-driven and code-level customizations.

## Architecture Approach

We use a **hybrid approach** combining:
1. **Configuration-Driven Customizations** (80% of needs)
2. **Modular/Plugin Architecture** (15% of needs)
3. **Git Branching Strategy** (5% of needs - only for major custom features)

## Database Schema for Customizations

### Core Tables (Already Implemented)
- `organizations` - Top-level tenants
- `instances` - Sub-tenants (e.g., departments)
- `users` - With roles and multi-tenancy
- `items`, `lendings`, `reservations`, `blacklists` - Core business entities

### New Customization Tables

1. **org_configurations**
   - Stores per-organization settings (lending rules, UI config, features)
   - JSONB fields for flexible configuration
   - Supports instance-level overrides

2. **feature_flags**
   - Defines available features that can be toggled per org
   - Role-based access control

3. **custom_field_definitions**
   - Allows orgs to add custom fields to entities
   - Supports various field types with validation

4. **customization_audit_log**
   - Tracks all configuration changes for compliance

## Implementation Patterns

### 1. Configuration-Based Customizations

```typescript
// Example: Loading org-specific configuration
class ConfigService {
  async getOrgConfig(orgId: number, instanceId?: number) {
    const config = await db.query(`
      SELECT * FROM org_settings 
      WHERE org_id = $1 AND instance_id = $2
    `, [orgId, instanceId]);
    
    return {
      lending: {
        maxDays: config.max_lending_days,
        latePenaltyPerDay: config.late_penalty_per_day,
        allowExtensions: config.allow_extensions,
        maxExtensions: config.max_extensions
      },
      theme: config.theme_config,
      features: config.enabled_features
    };
  }
}

// Usage in business logic
async function createLending(itemId: string, userId: string, dueDate: Date) {
  const config = await configService.getOrgConfig(currentOrg, currentInstance);
  
  // Apply org-specific rules
  if (config.lending.maxDays && daysDiff(now, dueDate) > config.lending.maxDays) {
    throw new Error(`Maximum lending period is ${config.lending.maxDays} days`);
  }
  
  // Continue with lending creation...
}
```

### 2. Feature Flag Implementation

```typescript
// Frontend: Conditionally render features
function Dashboard() {
  const { features } = useOrgConfig();
  
  return (
    <div>
      <ItemList />
      {features.includes('advanced_reporting') && <AnalyticsDashboard />}
      {features.includes('csv_import_export') && <CSVImportButton />}
    </div>
  );
}

// Backend: Check feature access
router.post('/api/csv/import', async (req, res) => {
  const hasFeature = await checkFeatureFlag(req.orgId, 'csv_import_export');
  if (!hasFeature) {
    return res.status(403).json({ error: 'Feature not enabled for organization' });
  }
  // Process CSV import...
});
```

### 3. Custom Fields Implementation

```typescript
// Define custom fields for an organization
await db.customFieldDefinitions.create({
  orgId: 1,
  entityType: 'item',
  fieldName: 'isbn',
  fieldType: 'text',
  fieldConfig: { 
    pattern: '^[0-9]{13}$',
    placeholder: 'Enter 13-digit ISBN'
  },
  isRequired: true
});

// Render custom fields in forms
function ItemForm({ orgId }) {
  const [customFields] = await getCustomFields(orgId, 'item');
  
  return (
    <form>
      {/* Standard fields */}
      <TextField name="name" label="Item Name" required />
      
      {/* Dynamic custom fields */}
      {customFields.map(field => (
        <DynamicField 
          key={field.fieldName}
          type={field.fieldType}
          name={field.fieldName}
          config={field.fieldConfig}
          required={field.isRequired}
        />
      ))}
    </form>
  );
}
```

### 4. Theme Customization

```typescript
// Apply org-specific theme
function App() {
  const { theme } = useOrgConfig();
  
  const customTheme = createTheme({
    palette: {
      primary: { main: theme.primaryColor || '#1976d2' },
      secondary: { main: theme.secondaryColor || '#dc004e' }
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: theme.logo ? `url(${theme.logo})` : undefined
          }
        }
      }
    }
  });
  
  return (
    <ThemeProvider theme={customTheme}>
      <CssBaseline />
      <Router>...</Router>
    </ThemeProvider>
  );
}
```

## Deployment Strategies

### 1. Multi-Tenant (Shared Infrastructure)
- Single deployment serving all organizations
- Configuration loaded based on authenticated user's org
- Most cost-effective for SaaS model

```yaml
# docker-compose.yml
services:
  app:
    image: borrowing-app:latest
    environment:
      - DEPLOYMENT_MODE=multi-tenant
      - DATABASE_URL=postgresql://...
```

### 2. Multi-Instance (Dedicated Infrastructure)
- Separate deployment per organization
- Use environment variables for org-specific config
- Better for enterprise clients with compliance needs

```bash
# Deploy for Organization A
docker run -d \
  -e ORG_ID=1 \
  -e DEPLOYMENT_TYPE=dedicated \
  -e CUSTOM_DOMAIN=orga.example.com \
  borrowing-app:orga

# Deploy for Organization B  
docker run -d \
  -e ORG_ID=2 \
  -e DEPLOYMENT_TYPE=dedicated \
  -e CUSTOM_DOMAIN=orgb.example.com \
  borrowing-app:orgb
```

### 3. Hybrid Approach
- Shared infrastructure for standard clients
- Dedicated deployments for enterprise clients
- Same codebase, different deployment configurations

## Git Workflow for Custom Features

When configuration isn't enough:

```bash
# 1. Create feature branch from main
git checkout -b feature/org-specific-workflow

# 2. Implement with feature flags
if (process.env.ORG_ID === '5' && config.features.includes('custom_workflow')) {
  // Custom implementation
}

# 3. Merge to main with flag disabled by default
git checkout main
git merge feature/org-specific-workflow

# 4. Enable for specific org via configuration
UPDATE org_configurations 
SET enabled_features = enabled_features || '["custom_workflow"]'
WHERE org_id = 5;
```

## Best Practices

1. **Start with Configuration**
   - Use database configs for 80% of customizations
   - Only write custom code when absolutely necessary

2. **Feature Flag Everything**
   - New features should be behind flags
   - Roll out gradually to organizations

3. **Maintain Backward Compatibility**
   - Don't break existing orgs when adding features
   - Use sensible defaults

4. **Document Customizations**
   - Keep a registry of which org uses which features
   - Document custom code paths

5. **Regular Reviews**
   - If multiple orgs request same customization, make it standard
   - Deprecate unused features

## Example: Onboarding New Organization

```sql
-- 1. Create organization
INSERT INTO organizations (name, deployment_type) 
VALUES ('ACME Corp', 'shared');

-- 2. Configure their preferences
SELECT update_org_configuration(
  3, -- org_id
  NULL, -- instance_id (org-level config)
  '{
    "max_lending_days": 21,
    "late_penalty_per_day": 2.50,
    "theme_config": {
      "primaryColor": "#FF6B6B",
      "logo": "https://acme.com/logo.png"
    },
    "enabled_features": ["email_notifications", "mobile_app", "advanced_reporting"]
  }'::jsonb
);

-- 3. Add custom fields they requested
INSERT INTO custom_field_definitions (org_id, entity_type, field_name, field_type, field_config)
VALUES 
  (3, 'item', 'serial_number', 'text', '{"required": true}'),
  (3, 'lending', 'department', 'select', '{"options": ["Engineering", "Sales", "HR"]}');

-- 4. Create their first admin user
INSERT INTO users (email, password, role, org_id)
VALUES ('admin@acme.com', '$2b$10$...', 'ADMIN', 3);
```

## Monitoring and Maintenance

1. **Track Feature Usage**
   ```sql
   SELECT 
     o.name,
     oc.enabled_features,
     COUNT(DISTINCT u.id) as active_users
   FROM organizations o
   JOIN org_configurations oc ON o.id = oc.org_id
   JOIN users u ON u.org_id = o.id
   WHERE u.last_login_at > NOW() - INTERVAL '30 days'
   GROUP BY o.id, o.name, oc.enabled_features;
   ```

2. **Audit Configuration Changes**
   ```sql
   SELECT * FROM customization_audit_log
   WHERE org_id = 3
   ORDER BY created_at DESC
   LIMIT 50;
   ```

3. **Version Management**
   - Tag releases with configuration schema versions
   - Provide migration scripts for configuration updates

This approach allows you to maintain a single codebase while providing the flexibility each organization needs!