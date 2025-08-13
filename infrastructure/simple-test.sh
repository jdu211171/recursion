#!/bin/bash

# Simple test to check basic functionality

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Testing API endpoint..."

# Test health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
if [ "$response" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed with status $response${NC}"
fi

# Test auth registration
echo ""
echo "Testing user registration..."

# Clear users first
docker exec infrastructure-postgres-1 psql -U root -d borrowing_db -c "TRUNCATE TABLE users CASCADE;" > /dev/null 2>&1

response=$(curl -s -w '\n%{http_code}' -X POST http://localhost/api/auth/register \
    -H 'Content-Type: application/json' \
    -d '{
        "email": "test@example.com",
        "password": "password123",
        "firstName": "Test",
        "lastName": "User",
        "role": "ADMIN",
        "orgId": 1,
        "instanceId": 1
    }')

status=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$status" == "201" ]; then
    echo -e "${GREEN}✓ User registration successful${NC}"
    echo "Response: $body"
else
    echo -e "${RED}✗ Registration failed with status $status${NC}"
    echo "Response: $body"
fi

# Test login
echo ""
echo "Testing user login..."

response=$(curl -s -w '\n%{http_code}' -X POST http://localhost/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{
        "email": "test@example.com",
        "password": "password123"
    }')

status=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$status" == "200" ]; then
    echo -e "${GREEN}✓ User login successful${NC}"
    token=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "Token received: ${token:0:20}..."
else
    echo -e "${RED}✗ Login failed with status $status${NC}"
    echo "Response: $body"
fi

echo ""
echo "All tests completed!"