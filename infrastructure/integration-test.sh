#!/bin/bash

# Comprehensive End-to-End Integration Test Script
# Tests all major features including new implementations

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost"
API_URL="$BASE_URL/api"

# Variables to store test data
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
CATEGORY_ID=""
ITEM_ID=""
LENDING_ID=""
FILE_ID=""
ORG_ID="1"
INSTANCE_ID="1"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_test_result() {
    local test_name=$1
    local status=$2
    local details=$3
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ "$status" == "pass" ]; then
        echo -e "${GREEN}✓ $test_name${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        if [ ! -z "$details" ]; then
            echo "  $details"
        fi
    else
        echo -e "${RED}✗ $test_name${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        if [ ! -z "$details" ]; then
            echo "  Error: $details"
        fi
    fi
}

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    
    local headers="-H 'Content-Type: application/json'"
    if [ ! -z "$ACCESS_TOKEN" ]; then
        headers="$headers -H 'Authorization: Bearer $ACCESS_TOKEN'"
    fi
    
    local cmd="curl -s -w '\n%{http_code}' -X $method $API_URL$endpoint $headers"
    if [ ! -z "$data" ]; then
        cmd="$cmd -d '$data'"
    fi
    
    local response=$(eval $cmd)
    local status=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$status" == "$expected_status" ]; then
        echo "$body"
        return 0
    else
        echo "Expected $expected_status, got $status. Response: $body" >&2
        return 1
    fi
}

# Test sections
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Comprehensive Integration Tests${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. Infrastructure Tests
echo -e "\n${YELLOW}1. Infrastructure Tests${NC}"

# Test health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health 2>/dev/null || echo "000")
if [ "$response" == "200" ]; then
    print_test_result "Health check" "pass"
else
    print_test_result "Health check" "fail" "Status code: $response"
fi

# Test service health endpoints
for service in "auth" "items" "files"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/$service/health 2>/dev/null || echo "000")
    if [ "$response" == "200" ]; then
        print_test_result "$service service health" "pass"
    else
        print_test_result "$service service health" "fail" "Status code: $response"
    fi
done

# 2. Authentication Tests
echo -e "\n${YELLOW}2. Authentication Tests${NC}"

# Clean up test user if exists
docker exec infrastructure-postgres-1 psql -U root -d borrowing_db -c "DELETE FROM users WHERE email = 'test@example.com';" > /dev/null 2>&1 || true

# Test user registration
register_data='{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "ADMIN",
    "orgId": 1,
    "instanceId": 1,
    "contactInfo": "+1234567890"
}'

response=$(api_call "POST" "/auth/register" "$register_data" "201" 2>&1)
if [ $? -eq 0 ]; then
    USER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_test_result "User registration" "pass" "User ID: $USER_ID"
else
    print_test_result "User registration" "fail" "$response"
fi

# Test user login
login_data='{
    "email": "test@example.com",
    "password": "Password123!"
}'

response=$(api_call "POST" "/auth/login" "$login_data" "200" 2>&1)
if [ $? -eq 0 ]; then
    ACCESS_TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$response" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    print_test_result "User login" "pass" "Token received: ${ACCESS_TOKEN:0:20}..."
else
    print_test_result "User login" "fail" "$response"
    echo -e "${RED}Cannot continue tests without authentication${NC}"
    exit 1
fi

# Test token refresh
refresh_data="{\"refreshToken\": \"$REFRESH_TOKEN\"}"
response=$(api_call "POST" "/auth/refresh" "$refresh_data" "200" 2>&1)
if [ $? -eq 0 ]; then
    NEW_ACCESS_TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    print_test_result "Token refresh" "pass"
    ACCESS_TOKEN=$NEW_ACCESS_TOKEN
else
    print_test_result "Token refresh" "fail" "$response"
fi

# 3. User Management Tests
echo -e "\n${YELLOW}3. User Management Tests${NC}"

# Create a regular user
user_data='{
    "email": "borrower@example.com",
    "password": "Password123!",
    "firstName": "Borrower",
    "lastName": "User",
    "role": "BORROWER",
    "orgId": 1,
    "instanceId": 1,
    "contactInfo": "+9876543210"
}'

response=$(api_call "POST" "/users" "$user_data" "201" 2>&1)
if [ $? -eq 0 ]; then
    BORROWER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_test_result "Create borrower user" "pass" "Borrower ID: $BORROWER_ID"
else
    print_test_result "Create borrower user" "fail" "$response"
fi

# Get users list
response=$(api_call "GET" "/users?orgId=$ORG_ID&instanceId=$INSTANCE_ID" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    user_count=$(echo "$response" | grep -o '"id"' | wc -l)
    print_test_result "Get users list" "pass" "Found $user_count users"
else
    print_test_result "Get users list" "fail" "$response"
fi

# Test blacklist functionality
if [ ! -z "$BORROWER_ID" ]; then
    blacklist_data='{
        "reason": "Test blacklist",
        "duration": 7
    }'
    
    response=$(api_call "POST" "/users/$BORROWER_ID/blacklist" "$blacklist_data" "200" 2>&1)
    if [ $? -eq 0 ]; then
        print_test_result "Add user to blacklist" "pass"
    else
        print_test_result "Add user to blacklist" "fail" "$response"
    fi
    
    # Remove from blacklist
    response=$(api_call "DELETE" "/users/$BORROWER_ID/blacklist" "" "200" 2>&1)
    if [ $? -eq 0 ]; then
        print_test_result "Remove user from blacklist" "pass"
    else
        print_test_result "Remove user from blacklist" "fail" "$response"
    fi
fi

# 4. Organization Configuration Tests
echo -e "\n${YELLOW}4. Organization Configuration Tests${NC}"

# Get organization configuration
response=$(api_call "GET" "/organizations/$ORG_ID/configuration" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    print_test_result "Get organization configuration" "pass"
else
    print_test_result "Get organization configuration" "fail" "$response"
fi

# Update organization configuration
config_data='{
    "lending_duration_days": 14,
    "max_renewals": 2,
    "late_fee_per_day": 1.50,
    "max_items_per_user": 5,
    "reservation_duration_days": 3,
    "blacklist_threshold_days": 30,
    "auto_blacklist_enabled": true,
    "require_approval": false,
    "allowed_file_types": ["pdf", "jpg", "png"],
    "max_file_size_mb": 25
}'

response=$(api_call "PUT" "/organizations/$ORG_ID/configuration" "$config_data" "200" 2>&1)
if [ $? -eq 0 ]; then
    print_test_result "Update organization configuration" "pass"
else
    print_test_result "Update organization configuration" "fail" "$response"
fi

# 5. Category Management Tests
echo -e "\n${YELLOW}5. Category Management Tests${NC}"

# Create category
category_data='{
    "name": "Test Books",
    "description": "Books for testing"
}'

response=$(api_call "POST" "/categories" "$category_data" "201" 2>&1)
if [ $? -eq 0 ]; then
    CATEGORY_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_test_result "Create category" "pass" "Category ID: $CATEGORY_ID"
else
    print_test_result "Create category" "fail" "$response"
fi

# Get categories
response=$(api_call "GET" "/categories" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    category_count=$(echo "$response" | grep -o '"id"' | wc -l)
    print_test_result "Get categories" "pass" "Found $category_count categories"
else
    print_test_result "Get categories" "fail" "$response"
fi

# 6. Item Management Tests
echo -e "\n${YELLOW}6. Item Management Tests${NC}"

# Create item
if [ ! -z "$CATEGORY_ID" ]; then
    item_data="{
        \"name\": \"Test Book\",
        \"description\": \"A book for testing\",
        \"categoryId\": \"$CATEGORY_ID\",
        \"totalCount\": 3,
        \"availableCount\": 3
    }"
    
    response=$(api_call "POST" "/items" "$item_data" "201" 2>&1)
    if [ $? -eq 0 ]; then
        ITEM_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_test_result "Create item" "pass" "Item ID: $ITEM_ID"
    else
        print_test_result "Create item" "fail" "$response"
    fi
fi

# Get items
response=$(api_call "GET" "/items" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    item_count=$(echo "$response" | grep -o '"id"' | wc -l)
    print_test_result "Get items" "pass" "Found $item_count items"
else
    print_test_result "Get items" "fail" "$response"
fi

# 7. Lending Workflow Tests
echo -e "\n${YELLOW}7. Lending Workflow Tests${NC}"

# Checkout item
if [ ! -z "$ITEM_ID" ] && [ ! -z "$BORROWER_ID" ]; then
    due_date=$(date -u -d "+14 days" +"%Y-%m-%dT%H:%M:%SZ")
    checkout_data="{
        \"itemId\": \"$ITEM_ID\",
        \"borrowerId\": \"$BORROWER_ID\",
        \"dueDate\": \"$due_date\"
    }"
    
    response=$(api_call "POST" "/lending/checkout" "$checkout_data" "201" 2>&1)
    if [ $? -eq 0 ]; then
        LENDING_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_test_result "Checkout item" "pass" "Lending ID: $LENDING_ID"
    else
        print_test_result "Checkout item" "fail" "$response"
    fi
fi

# Get active lendings
response=$(api_call "GET" "/lending/active" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    lending_count=$(echo "$response" | grep -o '"id"' | wc -l)
    print_test_result "Get active lendings" "pass" "Found $lending_count active lendings"
else
    print_test_result "Get active lendings" "fail" "$response"
fi

# Return item
if [ ! -z "$LENDING_ID" ]; then
    response=$(api_call "POST" "/lending/$LENDING_ID/return" "" "200" 2>&1)
    if [ $? -eq 0 ]; then
        print_test_result "Return item" "pass"
    else
        print_test_result "Return item" "fail" "$response"
    fi
fi

# 8. Reservation Tests
echo -e "\n${YELLOW}8. Reservation Tests${NC}"

# Create reservation
if [ ! -z "$ITEM_ID" ] && [ ! -z "$BORROWER_ID" ]; then
    start_date=$(date -u -d "+1 day" +"%Y-%m-%dT%H:%M:%SZ")
    end_date=$(date -u -d "+3 days" +"%Y-%m-%dT%H:%M:%SZ")
    reservation_data="{
        \"itemId\": \"$ITEM_ID\",
        \"userId\": \"$BORROWER_ID\",
        \"startDate\": \"$start_date\",
        \"endDate\": \"$end_date\"
    }"
    
    response=$(api_call "POST" "/reservations" "$reservation_data" "201" 2>&1)
    if [ $? -eq 0 ]; then
        RESERVATION_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_test_result "Create reservation" "pass" "Reservation ID: $RESERVATION_ID"
    else
        print_test_result "Create reservation" "fail" "$response"
    fi
fi

# 9. Analytics Tests
echo -e "\n${YELLOW}9. Analytics Tests${NC}"

# Get lending statistics
response=$(api_call "GET" "/lending/stats" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    print_test_result "Get lending statistics" "pass"
else
    print_test_result "Get lending statistics" "fail" "$response"
fi

# Get overdue items
response=$(api_call "GET" "/lending/overdue" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    overdue_count=$(echo "$response" | grep -o '"id"' | wc -l)
    print_test_result "Get overdue items" "pass" "Found $overdue_count overdue items"
else
    print_test_result "Get overdue items" "fail" "$response"
fi

# Get popular items
response=$(api_call "GET" "/items/popular?limit=10" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    print_test_result "Get popular items" "pass"
else
    print_test_result "Get popular items" "fail" "$response"
fi

# 10. CSV Import/Export Tests
echo -e "\n${YELLOW}10. CSV Import/Export Tests${NC}"

# Export items to CSV
response=$(curl -s -o /tmp/items_export.csv -w "%{http_code}" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$API_URL/csv/export?type=items")
if [ "$response" == "200" ]; then
    file_size=$(stat -f%z /tmp/items_export.csv 2>/dev/null || stat -c%s /tmp/items_export.csv 2>/dev/null || echo "0")
    print_test_result "Export items to CSV" "pass" "File size: $file_size bytes"
else
    print_test_result "Export items to CSV" "fail" "Status code: $response"
fi

# Export users to CSV
response=$(curl -s -o /tmp/users_export.csv -w "%{http_code}" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$API_URL/csv/export?type=users")
if [ "$response" == "200" ]; then
    file_size=$(stat -f%z /tmp/users_export.csv 2>/dev/null || stat -c%s /tmp/users_export.csv 2>/dev/null || echo "0")
    print_test_result "Export users to CSV" "pass" "File size: $file_size bytes"
else
    print_test_result "Export users to CSV" "fail" "Status code: $response"
fi

# Create test CSV for import
cat > /tmp/test_items.csv << EOF
name,description,categoryId,totalCount,availableCount
"Import Test Book 1","First imported book","$CATEGORY_ID",5,5
"Import Test Book 2","Second imported book","$CATEGORY_ID",3,3
EOF

# Import items from CSV
response=$(curl -s -w '\n%{http_code}' -X POST "$API_URL/csv/import" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "file=@/tmp/test_items.csv" \
    -F "type=items")
status=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$status" == "200" ]; then
    success_count=$(echo "$body" | grep -o '"successCount":[0-9]*' | cut -d':' -f2)
    print_test_result "Import items from CSV" "pass" "Imported $success_count items"
else
    print_test_result "Import items from CSV" "fail" "Status code: $status"
fi

# 11. File Upload Tests
echo -e "\n${YELLOW}11. File Upload Tests${NC}"

# Create a test file
echo "This is a test file for upload" > /tmp/test_upload.txt

# Upload file
if [ ! -z "$ITEM_ID" ]; then
    response=$(curl -s -w '\n%{http_code}' -X POST "$API_URL/files/upload" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -F "file=@/tmp/test_upload.txt" \
        -F "itemId=$ITEM_ID")
    status=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status" == "201" ]; then
        FILE_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_test_result "Upload file" "pass" "File ID: $FILE_ID"
    else
        print_test_result "Upload file" "fail" "Status code: $status"
    fi
fi

# 12. Audit Log Tests
echo -e "\n${YELLOW}12. Audit Log Tests${NC}"

# Get user activity logs
response=$(api_call "GET" "/users/$USER_ID/activity?limit=10" "" "200" 2>&1)
if [ $? -eq 0 ]; then
    activity_count=$(echo "$response" | grep -o '"action"' | wc -l)
    print_test_result "Get user activity logs" "pass" "Found $activity_count activities"
else
    print_test_result "Get user activity logs" "fail" "$response"
fi

# Test logout (should be logged)
response=$(api_call "POST" "/auth/logout" "{\"refreshToken\": \"$REFRESH_TOKEN\"}" "200" 2>&1)
if [ $? -eq 0 ]; then
    print_test_result "User logout" "pass"
else
    print_test_result "User logout" "fail" "$response"
fi

# Clean up test files
rm -f /tmp/items_export.csv /tmp/users_export.csv /tmp/test_items.csv /tmp/test_upload.txt

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total tests run: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi