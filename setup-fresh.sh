#!/bin/bash

# Fresh Setup Script for Recursion Project
# This script performs a complete fresh setup with database migration and seeding

echo "🚀 Starting fresh setup for Recursion project..."

# Check if PostgreSQL is running
echo "📍 Checking PostgreSQL status..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On macOS: brew services start postgresql"
    echo "   On Linux: sudo systemctl start postgresql"
    exit 1
fi

# Check if MinIO is running
echo "📍 Checking MinIO status..."
if ! curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "❌ MinIO is not running. Please start MinIO first."
    echo "   Run: minio server ~/minio-data --console-address ':9001'"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set default values if not in .env
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-borrowing_db}

# Create database if it doesn't exist
echo "📍 Creating database..."
PGPASSWORD=$DB_PASSWORD createdb -h localhost -p 5432 -U $DB_USER $DB_NAME 2>/dev/null || echo "Database '$DB_NAME' already exists"

# Run SQL migrations in order
echo "📍 Running SQL migrations..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME < infrastructure/db-init/init-schema.sql
echo "✅ Applied init-schema.sql"

PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME < infrastructure/db-init/migrate-to-count-based.sql
echo "✅ Applied migrate-to-count-based.sql"

PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME < infrastructure/db-init/multi-org-customization.sql
echo "✅ Applied multi-org-customization.sql"

PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME < infrastructure/db-init/add-missing-tables.sql
echo "✅ Applied add-missing-tables.sql"

# Generate Prisma clients for all services
echo "📍 Generating Prisma clients..."
(cd services/auth && bun prisma generate)
echo "✅ Generated Prisma client for auth service"

(cd services/business-logic && bun prisma generate)
echo "✅ Generated Prisma client for business-logic service"

(cd services/file-storage && bun prisma generate)
echo "✅ Generated Prisma client for file-storage service"

# Create .env files if they don't exist
echo "📍 Setting up environment files..."
for service in auth business-logic file-storage; do
    if [ ! -f "services/$service/.env" ]; then
        cp "services/$service/.env.example" "services/$service/.env" 2>/dev/null || {
            echo "Creating .env for $service..."
            cat > "services/$service/.env" << EOF
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
JWT_SECRET="your-secret-key-here-change-in-production"
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL="false"
FRONTEND_URL="http://localhost:5173"
EOF
        }
    fi
done

# Install dependencies for all services
echo "📍 Installing dependencies..."
(cd services/auth && bun install)
echo "✅ Installed dependencies for auth service"

(cd services/business-logic && bun install)
echo "✅ Installed dependencies for business-logic service"

(cd services/file-storage && bun install)
echo "✅ Installed dependencies for file-storage service"

(cd services/frontend && yarn install)
echo "✅ Installed dependencies for frontend service"

# Seed the database with medium dataset
echo "📍 Seeding database with sample data..."
./infrastructure/seed-all.sh medium

echo "
✅ Fresh setup complete!

To start the services:
1. In separate terminals, run:
   - cd services/auth && bun run start
   - cd services/business-logic && bun run start
   - cd services/file-storage && bun run start
   - cd services/frontend && yarn dev

2. Access the application at http://localhost:5173

3. Login with one of these credentials:
   - Admin: admin@cityuniversitylibrary.com / password123
   - Staff: john.doe@cityuniversitylibrary.com / password123
   - User: student1@university.edu / password123

"