#!/bin/bash

# =====================================================
# Schema Validation Test Script
# Tests if the schema.sql can be executed without errors
# =====================================================

echo "=========================================="
echo "Database Schema Validation Test"
echo "=========================================="
echo ""

# Configuration
DB_NAME="sportlife_test"
DB_USER="root"
DB_PASS=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Step 1: Drop test database if exists
echo "Step 1: Cleaning up previous test database..."
mysql -u $DB_USER -e "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
if [ $? -eq 0 ]; then
    print_success "Previous test database dropped"
else
    print_warning "No previous test database found"
fi
echo ""

# Step 2: Create test database
echo "Step 2: Creating test database..."
mysql -u $DB_USER -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if [ $? -eq 0 ]; then
    print_success "Test database created: $DB_NAME"
else
    print_error "Failed to create test database"
    exit 1
fi
echo ""

# Step 3: Execute schema
echo "Step 3: Executing schema.sql..."
mysql -u $DB_USER $DB_NAME < schema.sql 2>schema_errors.log
if [ $? -eq 0 ]; then
    print_success "Schema executed successfully"
else
    print_error "Schema execution failed. Check schema_errors.log for details"
    echo ""
    echo "Error details:"
    cat schema_errors.log
    exit 1
fi
echo ""

# Step 4: Verify tables created
echo "Step 4: Verifying tables..."
TABLE_COUNT=$(mysql -u $DB_USER $DB_NAME -e "SHOW TABLES;" | wc -l)
TABLE_COUNT=$((TABLE_COUNT - 1)) # Subtract header row

if [ $TABLE_COUNT -gt 0 ]; then
    print_success "Created $TABLE_COUNT tables"
else
    print_error "No tables created"
    exit 1
fi
echo ""

# Step 5: Check for foreign key constraints
echo "Step 5: Checking foreign key constraints..."
FK_COUNT=$(mysql -u $DB_USER $DB_NAME -e "
    SELECT COUNT(*) as count 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = '$DB_NAME' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY';
" | tail -1)

if [ $FK_COUNT -gt 0 ]; then
    print_success "Created $FK_COUNT foreign key constraints"
else
    print_warning "No foreign key constraints found"
fi
echo ""

# Step 6: Check for views
echo "Step 6: Checking views..."
VIEW_COUNT=$(mysql -u $DB_USER $DB_NAME -e "
    SELECT COUNT(*) as count 
    FROM information_schema.VIEWS 
    WHERE TABLE_SCHEMA = '$DB_NAME';
" | tail -1)

if [ $VIEW_COUNT -gt 0 ]; then
    print_success "Created $VIEW_COUNT views"
else
    print_warning "No views found"
fi
echo ""

# Step 7: Check for stored procedures
echo "Step 7: Checking stored procedures..."
PROC_COUNT=$(mysql -u $DB_USER $DB_NAME -e "
    SELECT COUNT(*) as count 
    FROM information_schema.ROUTINES 
    WHERE ROUTINE_SCHEMA = '$DB_NAME' 
    AND ROUTINE_TYPE = 'PROCEDURE';
" | tail -1)

if [ $PROC_COUNT -gt 0 ]; then
    print_success "Created $PROC_COUNT stored procedures"
else
    print_warning "No stored procedures found"
fi
echo ""

# Step 8: Check for triggers
echo "Step 8: Checking triggers..."
TRIGGER_COUNT=$(mysql -u $DB_USER $DB_NAME -e "
    SELECT COUNT(*) as count 
    FROM information_schema.TRIGGERS 
    WHERE TRIGGER_SCHEMA = '$DB_NAME';
" | tail -1)

if [ $TRIGGER_COUNT -gt 0 ]; then
    print_success "Created $TRIGGER_COUNT triggers"
else
    print_warning "No triggers found"
fi
echo ""

# Step 9: List all tables
echo "Step 9: Listing all tables..."
mysql -u $DB_USER $DB_NAME -e "SHOW TABLES;"
echo ""

# Step 10: Summary
echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="
print_success "Database: $DB_NAME"
print_success "Tables: $TABLE_COUNT"
print_success "Foreign Keys: $FK_COUNT"
print_success "Views: $VIEW_COUNT"
print_success "Stored Procedures: $PROC_COUNT"
print_success "Triggers: $TRIGGER_COUNT"
echo ""
print_success "Schema validation completed successfully!"
echo ""

# Optional: Keep or drop test database
read -p "Do you want to keep the test database? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    mysql -u $DB_USER -e "DROP DATABASE $DB_NAME;"
    print_success "Test database dropped"
else
    print_warning "Test database kept: $DB_NAME"
fi

echo ""
echo "=========================================="
