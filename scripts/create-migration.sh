#!/bin/bash

# Database Migration Helper Script
# Helps create new migrations with proper naming convention

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Setique Database Migration Helper ===${NC}\n"

# Check if description is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Migration description required${NC}"
    echo "Usage: ./create-migration.sh \"description_of_migration\""
    echo "Example: ./create-migration.sh \"add_user_preferences\""
    exit 1
fi

# Get description and sanitize it
DESCRIPTION=$(echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd '[:alnum:]_')

# Generate timestamp (UTC)
TIMESTAMP=$(date -u +%Y%m%d%H%M%S)

# Create filename
FILENAME="${TIMESTAMP}_${DESCRIPTION}.sql"
FILEPATH="supabase/migrations/${FILENAME}"

# Check if migrations directory exists
if [ ! -d "supabase/migrations" ]; then
    echo -e "${YELLOW}Creating migrations directory...${NC}"
    mkdir -p supabase/migrations
fi

# Check if file already exists
if [ -f "$FILEPATH" ]; then
    echo -e "${RED}Error: Migration file already exists: ${FILEPATH}${NC}"
    exit 1
fi

# Copy template and replace placeholders
echo -e "${GREEN}Creating migration: ${FILENAME}${NC}\n"

# Create the migration file from template
cp supabase/migrations/TEMPLATE.sql "$FILEPATH"

# Replace date in the file
CURRENT_DATE=$(date -u +%Y-%m-%d)
sed -i "s/YYYY-MM-DD/${CURRENT_DATE}/g" "$FILEPATH"

# Add description
sed -i "s/\[Brief description\]/${DESCRIPTION}/g" "$FILEPATH"

echo -e "${GREEN}✅ Migration created successfully!${NC}\n"
echo "📝 File: ${FILEPATH}"
echo ""
echo "Next steps:"
echo "1. Edit the migration file with your SQL changes"
echo "2. Test the migration in development"
echo "3. Apply to production via Supabase Dashboard"
echo ""
echo -e "${YELLOW}Remember:${NC}"
echo "  - Use IF NOT EXISTS for schema changes"
echo "  - Use IF EXISTS when dropping objects"
echo "  - Include verification queries"
echo "  - Document rollback steps"
echo ""
echo "Opening file in editor..."

# Try to open in VS Code if available
if command -v code &> /dev/null; then
    code "$FILEPATH"
else
    echo "Note: VS Code not found, please open manually: $FILEPATH"
fi
