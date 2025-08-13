# System Integration Testing Guide

## Prerequisites
1. Docker and Docker Compose installed
2. All services built and containerized
3. Environment variables configured in `.env` file

## Starting the System

1. Generate SSL certificates (for HTTPS):
   ```bash
   cd infrastructure
   ./generate-ssl-cert.sh
   ```

2. Start all services:
   ```bash
   docker-compose up -d
   ```

3. Check service health:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## Service Endpoints

- **Frontend**: http://localhost or https://localhost
- **API Gateway**: http://localhost/api
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)
- **Direct Service Access** (for debugging):
  - Auth: http://localhost:3000
  - Business Logic: http://localhost:3001
  - File Storage: http://localhost:3002

## Testing Workflows

### 1. User Registration and Authentication
```bash
# Register a new admin user
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN",
    "orgId": 1,
    "instanceId": 1
  }'

# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### 2. Category Management
```bash
# Create category (use token from login)
curl -X POST http://localhost/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Books",
    "description": "Library books"
  }'
```

### 3. Item Management
```bash
# Create item with multiple copies
curl -X POST http://localhost/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Book",
    "description": "A test book",
    "categoryId": "CATEGORY_ID",
    "copies": 3
  }'

# Get items
curl http://localhost/api/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Lending Workflow
```bash
# Checkout item
curl -X POST http://localhost/api/lending/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "ITEM_ID",
    "borrowerId": "USER_ID",
    "dueDate": "2024-12-31T00:00:00Z"
  }'

# Return item
curl -X POST http://localhost/api/lending/LENDING_ID/return \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. File Upload
```bash
# Upload file
curl -X POST http://localhost/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "itemId=ITEM_ID"
```

## Multi-Tenant Testing

1. Create multiple organizations in the database
2. Register users in different organizations
3. Verify data isolation:
   - Users from Org 1 cannot see items from Org 2
   - Instance-level isolation within organizations

## Performance Testing

```bash
# Basic load test with curl
for i in {1..100}; do
  curl http://localhost/api/items \
    -H "Authorization: Bearer YOUR_TOKEN" &
done
```

## Troubleshooting

1. **Service won't start**: Check logs with `docker-compose logs SERVICE_NAME`
2. **Database connection issues**: Ensure PostgreSQL is running and migrations applied
3. **MinIO issues**: Check MinIO is accessible at port 9000
4. **Network issues**: Verify all services are on the same Docker network

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v
```