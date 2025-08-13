#!/bin/bash

# Stop Local Services Script

echo "🛑 Stopping local development services..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    
    if lsof -ti:$port >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $service_name on port $port...${NC}"
        kill -9 $(lsof -ti:$port) 2>/dev/null
        echo -e "${GREEN}✅ $service_name stopped${NC}"
    else
        echo -e "${YELLOW}$service_name not running on port $port${NC}"
    fi
}

# Stop all services
kill_port 3000 "Auth Service"
kill_port 3001 "Business Logic Service"
kill_port 3002 "File Storage Service"

# Stop Docker containers if running
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo -e "${YELLOW}Stopping Docker containers...${NC}"
    
    # Stop PostgreSQL
    if docker ps -a | grep -q recursion-postgres; then
        docker stop recursion-postgres >/dev/null 2>&1
        docker rm recursion-postgres >/dev/null 2>&1
        echo -e "${GREEN}✅ PostgreSQL container stopped${NC}"
    fi
    
    # Stop MinIO
    if docker ps -a | grep -q recursion-minio; then
        docker stop recursion-minio >/dev/null 2>&1
        docker rm recursion-minio >/dev/null 2>&1
        echo -e "${GREEN}✅ MinIO container stopped${NC}"
    fi
fi

echo -e "${GREEN}✨ All services stopped!${NC}"