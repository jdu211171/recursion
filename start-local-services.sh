#!/bin/bash

# Start Local Services Script
# This script starts all backend services locally using Bun

echo "🚀 Starting local development services..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
    return $?
}

# Check if required service ports are available
SERVICE_PORTS=(3000 3001 3002)
for port in "${SERVICE_PORTS[@]}"; do
    if check_port $port; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        echo "Please stop the service using this port"
        exit 1
    fi
done

# Check database ports but don't exit if in use
if check_port 5432; then
    echo -e "${YELLOW}⚠️  PostgreSQL is already running on port 5432${NC}"
    POSTGRES_RUNNING=true
else
    POSTGRES_RUNNING=false
fi

if check_port 9000; then
    echo -e "${YELLOW}⚠️  MinIO is already running on port 9000${NC}"
    MINIO_RUNNING=true
else
    MINIO_RUNNING=false
fi

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Creating .env from example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Created .env file from example. Please edit it with your settings.${NC}"
    echo "Default values will be used for now."
    set -a
    source .env
    set +a
fi

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed${NC}"
    echo "Install it with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Install dependencies for all services
(cd services/auth && bun install)
(cd services/business-logic && bun install)
(cd services/file-storage && bun install)

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Start PostgreSQL with Docker if not running
if [ "$POSTGRES_RUNNING" = false ]; then
    echo -e "${YELLOW}🐘 Starting PostgreSQL...${NC}"
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        # Check if container exists but is stopped
        if docker ps -a --format '{{.Names}}' | grep -q '^recursion-postgres$'; then
            echo -e "${YELLOW}Starting existing PostgreSQL container...${NC}"
            docker start recursion-postgres
        else
            docker run -d \
                --name recursion-postgres \
                -e POSTGRES_USER=$DB_USER \
                -e POSTGRES_PASSWORD=$DB_PASSWORD \
                -e POSTGRES_DB=$DB_NAME \
                -p 5432:5432 \
                postgres:16
        fi
        echo -e "${GREEN}✅ PostgreSQL started${NC}"
    else
        echo -e "${RED}❌ Docker is not running. Please start Docker or use an existing PostgreSQL instance${NC}"
        echo "Continuing without PostgreSQL..."
    fi
else
    echo -e "${GREEN}✅ PostgreSQL already running${NC}"
fi

# Start MinIO with Docker if not running
if [ "$MINIO_RUNNING" = false ]; then
    echo -e "${YELLOW}📦 Starting MinIO...${NC}"
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        # Check if container exists but is stopped
        if docker ps -a --format '{{.Names}}' | grep -q '^recursion-minio$'; then
            echo -e "${YELLOW}Starting existing MinIO container...${NC}"
            docker start recursion-minio
        else
            docker run -d \
                --name recursion-minio \
                -e MINIO_ROOT_USER=minioadmin \
                -e MINIO_ROOT_PASSWORD=minioadmin \
                -p 9000:9000 \
                -p 9001:9001 \
                minio/minio server /data --console-address ":9001"
        fi
        echo -e "${GREEN}✅ MinIO started${NC}"
    else
        echo -e "${YELLOW}⚠️  MinIO not started (Docker not running)${NC}"
    fi
else
    echo -e "${GREEN}✅ MinIO already running${NC}"
fi

echo -e "${YELLOW}🚀 Starting backend services...${NC}"

# Function to start a service in the background
start_service() {
    local service_name=$1
    local service_dir=$2
    local port=$3
    
    echo -e "${YELLOW}Starting $service_name on port $port...${NC}"
    
    # Create a log file for the service
    mkdir -p logs
    
    # Start the service
    (cd $service_dir && \
        DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" \
        JWT_SECRET="${JWT_SECRET:-your-secret-key}" \
        JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-1h}" \
        JWT_REFRESH_EXPIRES_IN="${JWT_REFRESH_EXPIRES_IN:-7d}" \
        FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}" \
        MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}" \
        MINIO_PORT="${MINIO_PORT:-9000}" \
        MINIO_USE_SSL="${MINIO_USE_SSL:-false}" \
        MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}" \
        MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}" \
        PORT=$port \
        bun start > ../../logs/$service_name.log 2>&1 &)
    
    # Wait a moment for the service to start
    sleep 2
    
    # Check if service started successfully
    if check_port $port; then
        echo -e "${GREEN}✅ $service_name started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start $service_name${NC}"
        echo "Check logs/$service_name.log for details"
        echo "Common issues:"
        echo "  - Database connection failed (check PostgreSQL is running)"
        echo "  - Environment variables missing (check .env file)"
        echo "  - Port already in use by another process"
    fi
}

# Start all services
start_service "auth-service" "services/auth" 3000
start_service "business-logic-service" "services/business-logic" 3001
start_service "file-storage-service" "services/file-storage" 3002

echo -e "${GREEN}✨ All services started!${NC}"
echo ""
echo "Services running at:"
echo "  - Auth Service: http://localhost:3000"
echo "  - Business Logic: http://localhost:3001"
echo "  - File Storage: http://localhost:3002"
echo "  - Frontend: http://localhost:5173 (start separately with 'yarn dev')"
echo ""
echo "Logs available in ./logs/"
echo ""
echo "To stop all services, run: ./stop-local-services.sh"