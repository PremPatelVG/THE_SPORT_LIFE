#!/bin/bash

# Database Setup Script
# Reads credentials from .env file

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🗄️  Database Setup${NC}"
echo "===================="
echo ""

# # Load .env file
# if [ -f .env ]; then
#     export $(cat .env | grep -v '^#' | xargs)
#     echo -e "${GREEN}✅ Loaded .env file${NC}"
# else
#     echo -e "${RED}❌ .env file not found!${NC}"
#     echo "Please create .env file with database credentials"
#     exit 1
# fi

# Load .env file safely
if [ -f .env ]; then
    # Read each line, ignore comments and empty lines
    while IFS='=' read -r key value; do
        # Skip empty or comment lines
        if [[ -z "$key" || "$key" == \#* ]]; then
            continue
        fi
        # Remove surrounding quotes
        value="${value%\"}"
        value="${value#\"}"
        export "$key=$value"
    done < .env
    echo -e "${GREEN}✅ Loaded .env file${NC}"
else
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file with database credentials"
    exit 1
fi




# Set defaults (will be overridden by .env)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-tournament_user}
DB_NAME=${DB_NAME:-sports_tournament_db}

echo ""
echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Check if password is in .env
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${BLUE}ℹ️  DB_PASSWORD not found in .env${NC}"
    read -sp "Enter MySQL password for user '$DB_USER': " DB_PASSWORD
    echo ""
fi

# Test connection
echo ""
echo -e "${BLUE}ℹ️  Testing MySQL connection...${NC}"
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful${NC}"
else
    echo -e "${RED}❌ Connection failed!${NC}"
    echo "Please check your credentials in .env file"
    exit 1
fi

# Create database
echo ""
echo -e "${BLUE}ℹ️  Creating database '$DB_NAME'...${NC}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
echo -e "${GREEN}✅ Database created/verified${NC}"

# Run migrations
echo ""
echo -e "${BLUE}ℹ️  Running migrations...${NC}"

echo "  → Main schema (35+ tables)..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/schema.sql
echo -e "${GREEN}  ✅ Main schema imported${NC}"

echo "  → Referee ratings..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/01_add_referee_ratings.sql
echo -e "${GREEN}  ✅ Referee ratings added${NC}"

echo "  → Notifications..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/02_create_notifications.sql
echo -e "${GREEN}  ✅ Notifications added${NC}"

# Count tables
TABLE_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';")

echo ""
echo "===================="
echo -e "${GREEN}✅ Database Setup Complete!${NC}"
echo "===================="
echo ""
echo "📊 Total Tables: $TABLE_COUNT"
echo ""
