#!/bin/bash

# Supabase Type Generation Script
# Automatically generates TypeScript types from Supabase database schema

set -e  # Exit on any error

echo "🔄 Generating Supabase TypeScript types..."

# Note: Using npx to invoke Supabase CLI from pinned devDependency version
# This ensures reproducible builds without mutating global toolchain

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Check for required environment variables
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL not set in .env"
    exit 1
fi

# Extract project ref from Supabase URL
# URL format: https://xxxxx.supabase.co
PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')

echo "📦 Project: $PROJECT_REF"

# Generate types
echo "🔨 Generating types..."
npx supabase gen types typescript --project-id "$PROJECT_REF" > lib/types/database.ts.new

# Check if generation was successful
if [ $? -eq 0 ]; then
    # Backup existing types
    if [ -f "lib/types/database.ts" ]; then
        echo "💾 Backing up existing types..."
        cp lib/types/database.ts lib/types/database.ts.backup
    fi
    
    # Replace with new types
    mv lib/types/database.ts.new lib/types/database.ts
    
    echo "✅ Types generated successfully!"
    echo "📁 File: lib/types/database.ts"
    echo "💡 Previous version backed up to: lib/types/database.ts.backup"
    
    # Show diff if backup exists
    if [ -f "lib/types/database.ts.backup" ]; then
        echo ""
        echo "📊 Changes:"
        diff -u lib/types/database.ts.backup lib/types/database.ts || true
    fi
else
    echo "❌ Type generation failed"
    rm -f lib/types/database.ts.new
    exit 1
fi

echo ""
echo "🎉 Done! You can now use the updated types in your application."
