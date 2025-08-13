# Database Seeding Guide

This guide explains how to use the database seeding system to populate your development, testing, or demo environments with realistic sample data.

## Overview

The seeding system creates hierarchical, multi-tenant data across all three microservices:
- **Auth Service**: Organizations, instances, users, and preferences
- **Business Logic Service**: Categories, items, lendings, reservations, policies
- **File Storage Service**: File metadata and attachments

## Prerequisites

1. PostgreSQL database running and accessible
2. All services have `.env` files configured with `DATABASE_URL`
3. Database migrations have been applied:
   ```bash
   cd infrastructure/db-init
   psql -U your_user -d your_database < init-schema.sql
   psql -U your_user -d your_database < migrate-to-count-based.sql
   psql -U your_user -d your_database < multi-org-customization.sql
   psql -U your_user -d your_database < add-missing-tables.sql
   ```

## Quick Start

### Seed All Services (Recommended)

From the infrastructure directory:

```bash
cd infrastructure
./seed-all.sh medium
```

This will seed all services in the correct order with a medium-sized dataset.

### Seed Individual Services

Each service can be seeded independently, but **must be done in order**:

1. **Auth Service** (required first):
   ```bash
   cd services/auth
   bun run seed:medium
   ```

2. **Business Logic Service** (requires auth data):
   ```bash
   cd services/business-logic
   bun run seed:medium
   ```

3. **File Storage Service** (requires auth and business data):
   ```bash
   cd services/file-storage
   bun run seed:medium
   ```

## Dataset Sizes

Three dataset sizes are available:

### Small Dataset
- **Usage**: Quick development and testing
- **Command**: `./seed-all.sh small` or `bun run seed:small`
- **Data Volume**:
  - 1 organization
  - 2 instances per org
  - 10 users per org
  - 10 items per instance
  - 5 active lendings

### Medium Dataset (Default)
- **Usage**: Standard development and testing
- **Command**: `./seed-all.sh medium` or `bun run seed:medium`
- **Data Volume**:
  - 3 organizations
  - 3 instances per org
  - 15 users per org
  - 30 items per instance
  - 20 active lendings
  - 10 reservations

### Large Dataset
- **Usage**: Performance testing and demos
- **Command**: `./seed-all.sh large` or `bun run seed:large`
- **Data Volume**:
  - 5 organizations
  - 4 instances per org
  - 40 users per org
  - 100 items per instance
  - 80 active lendings
  - 40 reservations

## Sample Organizations and Users

The seeder creates these organizations:

1. **City University Library**
   - Type: Academic institution
   - Instances: Main Library, Science Library, Digital Resources

2. **TechCorp Equipment Center**
   - Type: Corporate
   - Instances: Electronics Lab, Hardware Tools, Testing Equipment

3. **Community Resource Hub**
   - Type: Public/Community
   - Instances: Books & Media, Event Equipment, Sports Gear

### Default Login Credentials

All seeded users have the password: `password123`

**Admin accounts** (one per organization):
- `admin@cityuniversitylibrary.com`
- `admin@techcorpequipmentcenter.com`
- `admin@communityresourcehub.com`

**Staff accounts**:
- `staff1@[organization].com`
- `staff2@[organization].com`

**Borrower accounts**:
- `user1@[organization].com`
- `user2@[organization].com`
- etc.

## Test Scenarios Created

The seeder creates realistic test scenarios:

### 1. Overdue Items
- Some lendings are created with past due dates
- Users with overdue items are automatically blacklisted
- Overdue notifications are generated

### 2. Reservation Queues
- Items with zero availability have reservations
- Queue positions are assigned
- Future reservation dates are set

### 3. Blacklisted Users
- Users with overdue items get temporary bans
- Ban duration scales with days overdue (3 days per overdue day)
- Maximum blacklist period: 30 days

### 4. File Attachments
- PDF manuals and documentation attached to items
- Organization policy documents
- Various file types and sizes (up to 3MB)

### 5. User Preferences
- Random theme preferences (light/dark)
- Notification settings varied
- Different view preferences

## Resetting and Re-seeding

To completely reset and re-seed:

```bash
# Reset all services and re-seed
cd infrastructure
./seed-all.sh medium

# Or for individual service:
cd services/auth
bun run seed:reset
```

**Warning**: This will delete all existing data!

## Troubleshooting

### "No organizations found" Error
- Run auth service seeder first
- Check database connection in auth service

### "No items found" Error
- Run business-logic seeder after auth
- Ensure business-logic service can connect to database

### Permission Errors
- Ensure `seed-all.sh` is executable: `chmod +x seed-all.sh`
- Check PostgreSQL user permissions

### Connection Issues
- Verify `DATABASE_URL` in each service's `.env` file
- Ensure PostgreSQL is running
- Check network connectivity

## Data Relationships

The seeder maintains proper relationships:

```
Organizations (1) → (N) Instances
     ↓                    ↓
   Users              Categories
     ↓                    ↓
 Preferences            Items
     ↓                    ↓
 Blacklists      Lendings/Reservations
                          ↓
                    Item History
                          ↓
                   File Attachments
```

## Development Tips

1. **Start Small**: Use small dataset for rapid development
2. **Test Edge Cases**: Large dataset includes overdue items, blacklists
3. **Multi-tenant Testing**: Each org has isolated data
4. **Performance Testing**: Use large dataset to test scalability
5. **Demo Ready**: Medium dataset perfect for client demos

## Extending the Seeders

To add more test data:

1. Edit the seed files in `services/*/prisma/seed.ts`
2. Add new templates or scenarios
3. Update dataset configurations
4. Test with all three dataset sizes

## Environment Variables

Optional environment variables:

- `SEED_SIZE`: Override default size (small/medium/large)
- `DATABASE_URL`: Database connection string
- `NODE_ENV`: Set to 'development' for detailed logging