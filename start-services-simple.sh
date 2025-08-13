#!/bin/bash

# Simple Start Script - No Docker Required
# This script starts all backend services using Bun

echo "🚀 Starting backend services (simple mode)..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed${NC}"
    echo "Install it with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    source .env
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Creating .env from example..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env file and run this script again${NC}"
    exit 1
fi

# Create logs directory
mkdir -p logs

echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Install dependencies
echo "Installing auth service dependencies..."
(cd services/auth && bun install --silent)

echo "Installing business-logic service dependencies..."
(cd services/business-logic && bun install --silent)

echo "Installing file-storage service dependencies..."
(cd services/file-storage && bun install --silent)

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Function to start service
start_service() {
    local name=$1
    local dir=$2
    local port=$3
    
    echo -e "${YELLOW}Starting $name...${NC}"
    
    cd "$dir"
    PORT=$port \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="${JWT_SECRET:-your-secret-key}" \
    JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-1h}" \
    JWT_REFRESH_EXPIRES_IN="${JWT_REFRESH_EXPIRES_IN:-7d}" \
    FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}" \
    MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}" \
    MINIO_PORT="${MINIO_PORT:-9000}" \
    MINIO_USE_SSL="${MINIO_USE_SSL:-false}" \
    MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}" \
    MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}" \
    bun start > ../../logs/$name.log 2>&1 &
    
    cd ../..
    sleep 1
}

# Start services
start_service "auth" "services/auth" 3000
start_service "business-logic" "services/business-logic" 3001
start_service "file-storage" "services/file-storage" 3002

echo -e "${GREEN}✨ Services starting...${NC}"
echo ""
echo "Services will be available at:"
echo "  - Auth Service: http://localhost:3000"
echo "  - Business Logic: http://localhost:3001"
echo "  - File Storage: http://localhost:3002"
echo ""
echo "Check logs in ./logs/ for any errors"
echo ""
echo -e "${YELLOW}⚠️  Note: This assumes you have PostgreSQL running locally${NC}"
echo "If not, you can:"
echo "1. Install PostgreSQL locally"
echo "2. Use Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres"
echo "3. Use the full Docker Compose setup instead"
echo ""
echo "To stop services: pkill -f 'bun.*index.ts'"