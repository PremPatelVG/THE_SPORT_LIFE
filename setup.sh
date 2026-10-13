#!/bin/bash

# SportLife Backend Setup Script
# This script will automatically set up the database and start the project

set -e  # Exit on error

echo "🚀 SportLife Backend Setup"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    print_success ".env file created"
    print_warning "Please update .env with your actual credentials before continuing!"
    echo ""
    read -p "Press Enter to continue after updating .env, or Ctrl+C to exit..."
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set defaults if not in .env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-tournament_user}
DB_NAME=${DB_NAME:-sports_tournament_db}

# Check if required variables are set
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    print_error "Database credentials not set in .env file"
    exit 1
fi

echo ""
print_info "Database Configuration:"
echo "  Host: ${DB_HOST:-localhost}"
echo "  Port: ${DB_PORT:-3306}"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Ask for MySQL password
read -sp "Enter MySQL password for user '$DB_USER': " MYSQL_PASSWORD
echo ""
echo ""

# Test MySQL connection
print_info "Testing MySQL connection..."
if mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
    print_success "MySQL connection successful"
else
    print_error "Failed to connect to MySQL. Please check your credentials."
    exit 1
fi

# Create database
print_info "Creating database '$DB_NAME'..."
mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$MYSQL_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
print_success "Database created/verified"

# Run main schema
print_info "Running main schema (35+ tables)..."
if [ -f "database/schema.sql" ]; then
    mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" < database/schema.sql
    print_success "Main schema imported"
else
    print_error "database/schema.sql not found!"
    exit 1
fi

# Run migration 1
print_info "Running migration: Referee Ratings..."
if [ -f "database/01_add_referee_ratings.sql" ]; then
    mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" < database/01_add_referee_ratings.sql
    print_success "Referee ratings table added"
else
    print_warning "database/01_add_referee_ratings.sql not found, skipping..."
fi

# Run migration 2
print_info "Running migration: Notifications..."
if [ -f "database/02_create_notifications.sql" ]; then
    mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" < database/02_create_notifications.sql
    print_success "Notifications tables added"
else
    print_warning "database/02_create_notifications.sql not found, skipping..."
fi

# Verify tables
print_info "Verifying database tables..."
TABLE_COUNT=$(mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';")
print_success "Database setup complete! Total tables: $TABLE_COUNT"

# Install dependencies
echo ""
print_info "Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_error "package.json not found!"
    exit 1
fi

# Summary
echo ""
echo "================================"
print_success "Setup Complete! 🎉"
echo "================================"
echo ""
echo "📊 Database: $DB_NAME ($TABLE_COUNT tables)"
echo "📦 Dependencies: Installed"
echo ""
echo "🚀 To start the server:"
echo "   npm run dev    (Development mode)"
echo "   npm start      (Production mode)"
echo ""
echo "📚 API Documentation:"
echo "   http://localhost:${PORT:-3000}/api/v1"
echo ""
echo "🔍 Health Check:"
echo "   http://localhost:${PORT:-3000}/health"
echo ""

# Ask if user wants to start server
read -p "Do you want to start the server now? (y/n): " START_SERVER

if [ "$START_SERVER" = "y" ] || [ "$START_SERVER" = "Y" ]; then
    echo ""
    print_info "Starting server in development mode..."
    npm run dev
else
    echo ""
    print_info "You can start the server later with: npm run dev"
fi
