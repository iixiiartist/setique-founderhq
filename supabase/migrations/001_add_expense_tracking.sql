-- Migration: Add Expense Tracking
-- Date: 2025-11-01
-- Description: Adds expenses table with categories and payment methods

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create expense categories enum (if not exists)
DO $$ BEGIN
    CREATE TYPE expense_category AS ENUM (
        'Software/SaaS',
        'Marketing',
        'Office',
        'Legal',
        'Contractors',
        'Travel',
        'Meals',
        'Equipment',
        'Subscriptions',
        'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment method enum (if not exists)
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'Credit Card',
        'Debit Card',
        'Bank Transfer',
        'Cash',
        'PayPal',
        'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID, -- Will be used later for team features
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    category expense_category NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    vendor TEXT,
    payment_method payment_method,
    receipt_document_id UUID, -- FK to documents will be added later
    notes JSONB DEFAULT '[]'
);

-- Create indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_id ON expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Create trigger for updated_at on expenses
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at 
    BEFORE UPDATE ON expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expenses
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
CREATE POLICY "Users can insert own expenses" ON expenses 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own expenses" ON expenses 
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own expenses" ON expenses 
    FOR DELETE USING (auth.uid() = user_id);

