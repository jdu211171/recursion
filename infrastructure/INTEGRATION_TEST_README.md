# Integration Test Suite

## Overview
This comprehensive integration test suite validates all major features implemented in the borrowing/lending system, including the recently added CSV import/export, category management, analytics dashboard, and audit logging functionality.

## Prerequisites
1. All services must be running via Docker Compose
2. PostgreSQL database must be initialized with all migrations
3. MinIO must be accessible

## Running the Tests

### Quick Start
```bash
cd infrastructure
./integration-test.sh
```

### What the Tests Cover
1. **Infrastructure Tests** - Service health checks
2. **Authentication Tests** - User registration, login, token refresh
3. **User Management Tests** - CRUD operations, blacklist functionality
4. **Organization Configuration Tests** - Settings management
5. **Category Management Tests** - Create and list categories
6. **Item Management Tests** - Create and list items
7. **Lending Workflow Tests** - Checkout, active lendings, returns
8. **Reservation Tests** - Create reservations
9. **Analytics Tests** - Statistics, overdue items, popular items
10. **CSV Import/Export Tests** - Bulk data operations
11. **File Upload Tests** - File attachments to items
12. **Audit Log Tests** - Activity tracking verification

### Expected Results
- Total tests: 30+
- All tests should pass if the system is properly configured
- Test results are color-coded (green = pass, red = fail)

### Troubleshooting
- If authentication tests fail, ensure the auth service is running
- If database tests fail, check PostgreSQL connection and migrations
- If file upload tests fail, verify MinIO is accessible
- Check service logs: `docker-compose logs [service-name]`

### Test Data Cleanup
The script automatically:
- Removes test users after completion
- Cleans up temporary CSV files
- Maintains database integrity

## Manual Testing
For manual testing of specific features:
- Frontend: http://localhost:5173
- API Gateway: http://localhost/api
- Direct service access available on ports 3000-3002