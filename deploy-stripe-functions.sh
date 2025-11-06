#!/bin/bash

# Deploy all Stripe-related Supabase Edge Functions
# Run this after setting up your Stripe products and configuring environment variables

echo "🚀 Deploying Stripe Edge Functions to Supabase..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in and linked
echo "📋 Checking Supabase connection..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Run: supabase login"
    exit 1
fi

echo "✅ Supabase connection verified"
echo ""

# Deploy functions
echo "📦 Deploying create-checkout-session..."
supabase functions deploy create-checkout-session
if [ $? -eq 0 ]; then
    echo "✅ create-checkout-session deployed"
else
    echo "❌ Failed to deploy create-checkout-session"
    exit 1
fi
echo ""

echo "📦 Deploying create-portal-session..."
supabase functions deploy create-portal-session
if [ $? -eq 0 ]; then
    echo "✅ create-portal-session deployed"
else
    echo "❌ Failed to deploy create-portal-session"
    exit 1
fi
echo ""

echo "📦 Deploying stripe-webhook..."
supabase functions deploy stripe-webhook
if [ $? -eq 0 ]; then
    echo "✅ stripe-webhook deployed"
else
    echo "❌ Failed to deploy stripe-webhook"
    exit 1
fi
echo ""

echo "📦 Deploying update-subscription-seats..."
supabase functions deploy update-subscription-seats
if [ $? -eq 0 ]; then
    echo "✅ update-subscription-seats deployed"
else
    echo "❌ Failed to deploy update-subscription-seats"
    exit 1
fi
echo ""

echo "🎉 All Stripe Edge Functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up Stripe webhook endpoint"
echo "2. Add webhook secret to Supabase: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx"
echo "3. Test your integration with test cards"
echo ""
echo "Need help? Check STRIPE_INTEGRATION_GUIDE.md"
