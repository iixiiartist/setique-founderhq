-- Add phone and title columns to contacts table

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';

-- Add helpful comments
COMMENT ON COLUMN contacts.phone IS 'Contact phone number';
COMMENT ON COLUMN contacts.title IS 'Contact job title (e.g., CEO, VP Sales)';
