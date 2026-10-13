#!/bin/bash

# Team Eligibility API Test Script
# This script tests the enhanced team eligibility endpoints

# Configuration
BASE_URL="http://localhost:5000/api/v1"
TOKEN="YOUR_JWT_TOKEN_HERE"  # Replace with actual token

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Team Eligibility API Test Suite"
echo "========================================="
echo ""

# Test 1: Get Eligible Teams
echo -e "${YELLOW}Test 1: Get Eligible Teams${NC}"
echo "GET $BASE_URL/tournaments/1/eligible-teams"
echo ""

RESPONSE=$(curl -s -X GET "$BASE_URL/tournaments/1/eligible-teams" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Test 1 Passed${NC}"
    
    # Extract team IDs for next test
    TEAM_IDS=$(echo "$RESPONSE" | jq -r '.data[].id')
    FIRST_TEAM_ID=$(echo "$TEAM_IDS" | head -n 1)
else
    echo -e "${RED}✗ Test 1 Failed${NC}"
fi

echo ""
echo "========================================="
echo ""

# Test 2: Check Team Eligibility (if we have a team ID)
if [ ! -z "$FIRST_TEAM_ID" ]; then
    echo -e "${YELLOW}Test 2: Check Team Eligibility${NC}"
    echo "GET $BASE_URL/tournaments/1/check-team-eligibility/$FIRST_TEAM_ID"
    echo ""

    RESPONSE=$(curl -s -X GET "$BASE_URL/tournaments/1/check-team-eligibility/$FIRST_TEAM_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")

    echo "Response:"
    echo "$RESPONSE" | jq '.'
    echo ""

    # Check if successful
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
        echo -e "${GREEN}✓ Test 2 Passed${NC}"
        
        # Show eligibility status
        ELIGIBLE=$(echo "$RESPONSE" | jq -r '.data.eligible')
        if [ "$ELIGIBLE" == "true" ]; then
            echo -e "${GREEN}Team is eligible to register${NC}"
        else
            echo -e "${RED}Team is not eligible${NC}"
            echo "Reasons:"
            echo "$RESPONSE" | jq -r '.data.reasons[]' | while read reason; do
                echo "  - $reason"
            done
        fi
    else
        echo -e "${RED}✗ Test 2 Failed${NC}"
    fi
else
    echo -e "${YELLOW}Test 2: Skipped (no teams found)${NC}"
fi

echo ""
echo "========================================="
echo ""

# Test 3: Check Non-existent Team
echo -e "${YELLOW}Test 3: Check Non-existent Team (Error Handling)${NC}"
echo "GET $BASE_URL/tournaments/1/check-team-eligibility/99999"
echo ""

RESPONSE=$(curl -s -X GET "$BASE_URL/tournaments/1/check-team-eligibility/99999" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Should return not eligible
if echo "$RESPONSE" | jq -e '.data.eligible == false' > /dev/null; then
    echo -e "${GREEN}✓ Test 3 Passed (correctly handles non-existent team)${NC}"
else
    echo -e "${RED}✗ Test 3 Failed${NC}"
fi

echo ""
echo "========================================="
echo ""

# Test 4: Get Eligible Teams for Non-existent Tournament
echo -e "${YELLOW}Test 4: Get Eligible Teams for Non-existent Tournament${NC}"
echo "GET $BASE_URL/tournaments/99999/eligible-teams"
echo ""

RESPONSE=$(curl -s -X GET "$BASE_URL/tournaments/99999/eligible-teams" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Should return error
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}✓ Test 4 Passed (correctly handles non-existent tournament)${NC}"
else
    echo -e "${RED}✗ Test 4 Failed${NC}"
fi

echo ""
echo "========================================="
echo ""

# Test 5: Unauthorized Access (no token)
echo -e "${YELLOW}Test 5: Unauthorized Access (No Token)${NC}"
echo "GET $BASE_URL/tournaments/1/eligible-teams"
echo ""

RESPONSE=$(curl -s -X GET "$BASE_URL/tournaments/1/eligible-teams" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Should return unauthorized error
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}✓ Test 5 Passed (correctly requires authentication)${NC}"
else
    echo -e "${RED}✗ Test 5 Failed${NC}"
fi

echo ""
echo "========================================="
echo "Test Suite Complete"
echo "========================================="
echo ""

# Summary
echo "Summary:"
echo "- Test 1: Get Eligible Teams"
echo "- Test 2: Check Team Eligibility"
echo "- Test 3: Error Handling (Non-existent Team)"
echo "- Test 4: Error Handling (Non-existent Tournament)"
echo "- Test 5: Authentication Check"
echo ""
echo "Note: Replace TOKEN variable with your actual JWT token"
echo "Note: Adjust tournament IDs based on your database"
