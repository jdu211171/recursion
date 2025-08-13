#!/bin/bash

# Database Seeder Orchestrator
# This script seeds all services in the correct dependency order

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the seed size from argument or default to medium
SEED_SIZE=${1:-medium}

echo -e "${YELLOW}🌱 Database Seeder Orchestrator${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Seed size: ${GREEN}${SEED_SIZE}${NC}"
echo ""

# Function to run seed in a service directory
run_seed() {
    local service=$1
    local service_path="../services/${service}"
    
    echo -e "${YELLOW}📦 Seeding ${service} service...${NC}"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}❌ Service directory not found: ${service_path}${NC}"
        exit 1
    fi
    
    cd "$service_path"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        bun install
    fi
    
    # Generate Prisma client
    echo "Generating Prisma client..."
    bun prisma generate
    
    # Run the seed script
    echo "Running seed script..."
    SEED_SIZE=$SEED_SIZE bun run seed
    
    cd - > /dev/null
    echo ""
}

# Start from infrastructure directory
cd "$(dirname "$0")"

echo -e "${YELLOW}Step 1/3: Seeding Auth Service${NC}"
echo "This creates organizations, instances, and users"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_seed "auth"

echo -e "${YELLOW}Step 2/3: Seeding Business Logic Service${NC}"
echo "This creates categories, items, lendings, and policies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_seed "business-logic"

echo -e "${YELLOW}Step 3/3: Seeding File Storage Service${NC}"
echo "This creates file metadata for items and organizations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_seed "file-storage"

echo ""
echo -e "${GREEN}✅ All services seeded successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You can now start the services with:"
echo "  - Auth Service: cd services/auth && bun run start"
echo "  - Business Logic: cd services/business-logic && bun run start"
echo "  - File Storage: cd services/file-storage && bun run start"
echo "  - Frontend: cd services/frontend && yarn dev"
echo ""
echo "Default login credentials:"
echo "  Admin: admin@cityuniversitylibrary.com / password123"
echo "  Staff: staff1@cityuniversitylibrary.com / password123"
echo "  User: user1@cityuniversitylibrary.com / password123"