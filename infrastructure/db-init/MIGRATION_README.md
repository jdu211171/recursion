# Database Migration Guide: Count-Based Item Model

## Overview
This migration transitions the item management system from a parent-child relationship model to an aggregate count-based model, simplifying inventory management and improving performance.

## Key Changes
1. **Items Table**:
   - Added `total_count` and `available_count` fields
   - Removed `parent_item_id` and `is_available` fields
   - Simplified from multiple item records to single records with quantities

2. **Users Table**:
   - Added `contact_info` field for recording user information during lending

3. **Business Logic**:
   - Updated to use atomic count operations instead of individual item tracking
   - Added support for multi-quantity borrowing and reservations

## Migration Steps

### 1. Backup Database
```bash
# Create a full database backup before migration
pg_dump -h localhost -U postgres -d borrowing_lending > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Run Migration
```bash
# Apply the migration script
psql -h localhost -U postgres -d borrowing_lending -f migrate-to-count-based.sql
```

### 3. Update Services
After running the migration:
1. Generate new Prisma clients in all services:
   ```bash
   cd services/auth && bun prisma generate
   cd ../business-logic && bun prisma generate
   cd ../file-storage && bun prisma generate
   ```

2. Restart all services to use the updated schema

### 4. Verify Migration
Run the verification queries at the end of the migration script to ensure:
- All items have proper count values
- No orphaned lendings or reservations exist
- Counts match expected values

## Rollback (if needed)
If issues arise, you can rollback using:
```bash
psql -h localhost -U postgres -d borrowing_lending -f rollback-count-based.sql
```

**Warning**: Rollback may result in data approximation as the exact distribution of items across copies cannot be perfectly reconstructed.

## Benefits of New Model
1. **Simpler**: No complex parent-child relationships
2. **Faster**: Fewer database queries and joins
3. **Clearer**: Easy to understand quantity management
4. **Scalable**: Better performance with large inventories

## Testing Checklist
- [ ] Create items with different quantities
- [ ] Borrow items and verify count decrements
- [ ] Return items and verify count increments
- [ ] Create reservations with quantities
- [ ] Cancel reservations and verify count restoration
- [ ] Test concurrent borrowing/returning
- [ ] Verify multi-tenant isolation