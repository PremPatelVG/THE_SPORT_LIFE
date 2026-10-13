#!/bin/bash

# Script to create MySQL user for SportLife
# Run this if user 'tournament_user' doesn't exist

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}👤 Create MySQL User${NC}"
echo "====================="
echo ""

# Load .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

DB_USER=${DB_USER:-tournament_user}
DB_NAME=${DB_NAME:-sports_tournament_db}

echo "Configuration:"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Ask for root password
read -sp "Enter MySQL root password: " ROOT_PASSWORD
echo ""
echo ""

# Check if user exists
echo -e "${BLUE}ℹ️  Checking if user exists...${NC}"
USER_EXISTS=$(mysql -u root -p"$ROOT_PASSWORD" -sN -e "SELECT COUNT(*) FROM mysql.user WHERE user = '$DB_USER';" 2>/dev/null || echo "0")

if [ "$USER_EXISTS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  User '$DB_USER' already exists${NC}"
    read -p "Do you want to drop and recreate? (y/n): " RECREATE
    
    if [ "$RECREATE" = "y" ] || [ "$RECREATE" = "Y" ]; then
        echo -e "${BLUE}ℹ️  Dropping existing user...${NC}"
        mysql -u root -p"$ROOT_PASSWORD" << EOF
DROP USER IF EXISTS '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
        echo -e "${GREEN}✅ User dropped${NC}"
    else
        echo "Keeping existing user"
        exit 0
    fi
fi

# Create user
echo ""
echo -e "${BLUE}ℹ️  Creating user '$DB_USER'...${NC}"

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ DB_PASSWORD not set in .env!${NC}"
    exit 1
fi

mysql -u root -p"$ROOT_PASSWORD" << EOF
-- Create user
CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';

-- Allow user to create databases (for testing)
GRANT CREATE ON *.* TO '$DB_USER'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}✅ User created successfully${NC}"

# Test connection
echo ""
echo -e "${BLUE}ℹ️  Testing connection...${NC}"
if mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${RED}❌ Connection failed!${NC}"
    exit 1
fi

echo ""
echo "====================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "====================="
echo ""
echo "User Details:"
echo "  Username: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Host: localhost"
echo ""
echo "You can now run: npm run db:setup"
echo ""
