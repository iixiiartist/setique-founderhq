-- Add burn_rate column to financial_logs table
-- This column was missing and causing query errors

ALTER TABLE financial_logs 
ADD COLUMN IF NOT EXISTS burn_rate NUMERIC(15, 2);

-- Add runway_months if it's also missing
ALTER TABLE financial_logs 
ADD COLUMN IF NOT EXISTS runway_months NUMERIC(10, 2);

-- Add comment for documentation
COMMENT ON COLUMN financial_logs.burn_rate IS 'Monthly burn rate in dollars';
COMMENT ON COLUMN financial_logs.runway_months IS 'Estimated runway in months based on current burn rate';
