#!/bin/bash

# Apple Sign-In Setup Script
# This script automates the setup process for Apple Sign-In authentication

echo "================================================"
echo "Apple Sign-In Setup Script"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install NPM package
echo -e "${YELLOW}Step 1: Installing apple-signin-auth package...${NC}"
npm install apple-signin-auth

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Package installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install package${NC}"
    exit 1
fi
echo ""

# Step 2: Check if .env file exists
echo -e "${YELLOW}Step 2: Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Please create a .env file based on .env.example"
    exit 1
fi

# Check if Apple config exists in .env
if grep -q "APPLE_CLIENT_ID" .env; then
    echo -e "${GREEN}✓ Apple configuration found in .env${NC}"
else
    echo -e "${YELLOW}! Apple configuration not found in .env${NC}"
    echo "Please add the following to your .env file:"
    echo ""
    echo "# Apple Sign-In"
    echo "APPLE_CLIENT_ID=com.yourapp.bundleid"
    echo "APPLE_BUNDLE_ID=com.yourapp.bundleid"
    echo ""
    echo "Replace 'com.yourapp.bundleid' with your actual iOS app bundle identifier"
fi
echo ""

# Step 3: Database migration
echo -e "${YELLOW}Step 3: Database migration...${NC}"
echo "Would you like to run the database migration now? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Please enter your database credentials:"
    read -p "Database user: " db_user
    read -sp "Database password: " db_pass
    echo ""
    read -p "Database name: " db_name
    
    echo "Running migration..."
    mysql -u "$db_user" -p"$db_pass" "$db_name" < database/migrations/add_apple_id_to_users.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database migration completed successfully${NC}"
    else
        echo -e "${RED}✗ Database migration failed${NC}"
        echo "Please run the migration manually:"
        echo "mysql -u your_user -p your_database < database/migrations/add_apple_id_to_users.sql"
    fi
else
    echo -e "${YELLOW}! Skipping database migration${NC}"
    echo "Remember to run it manually later:"
    echo "mysql -u your_user -p your_database < database/migrations/add_apple_id_to_users.sql"
fi
echo ""

# Step 4: Summary
echo "================================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with Apple credentials"
echo "2. Restart your backend server: npm start"
echo "3. Integrate with your mobile app"
echo "4. Test the authentication flow"
echo ""
echo "Documentation:"
echo "- API Guide: docs/APPLE_SIGNIN_API.md"
echo "- Setup Guide: APPLE_SIGNIN_SETUP.md"
echo "- Summary: APPLE_SIGNIN_IMPLEMENTATION_SUMMARY.md"
echo ""
echo "API Endpoints:"
echo "- POST /api/v1/auth/apple"
echo "- POST /api/v1/auth/complete-apple-registration"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
