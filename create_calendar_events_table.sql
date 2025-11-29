-- Create calendar_events table for custom calendar events
-- Run this in Supabase SQL Editor

-- Create the calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  end_date DATE,
  end_time TIME,
  all_day BOOLEAN DEFAULT FALSE,
  
  -- Event metadata
  event_type TEXT DEFAULT 'custom', -- custom, meeting, reminder, etc.
  location TEXT,
  color TEXT,
  
  -- Recurrence
  recurrence TEXT, -- daily, weekly, monthly, yearly, or RRULE string
  reminder_minutes INTEGER, -- minutes before event to remind
  
  -- Attendees (stored as JSON array of emails)
  attendees JSONB DEFAULT '[]'::JSONB,
  
  -- Links to other entities
  linked_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  linked_crm_item_id UUID REFERENCES crm_items(id) ON DELETE SET NULL,
  linked_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  
  -- Tags
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_date ON calendar_events(workspace_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_events_updated_at ON calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view calendar events in their workspace
CREATE POLICY "Users can view workspace calendar events"
  ON calendar_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create calendar events in their workspace
CREATE POLICY "Users can create workspace calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can update calendar events in their workspace
CREATE POLICY "Users can update workspace calendar events"
  ON calendar_events FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete calendar events in their workspace
CREATE POLICY "Users can delete workspace calendar events"
  ON calendar_events FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Grant service role full access for API endpoints
CREATE POLICY "Service role full access to calendar events"
  ON calendar_events FOR ALL
  USING (auth.role() = 'service_role');

-- Verify the table was created
SELECT 'calendar_events table created successfully' AS status;
