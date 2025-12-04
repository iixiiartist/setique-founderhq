-- Create prompt_injection_attacks table for training dataset
-- This stores detected attacks for future model fine-tuning

CREATE TABLE IF NOT EXISTS prompt_injection_attacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    input_text TEXT NOT NULL,
    threats TEXT[] NOT NULL DEFAULT '{}',
    categories TEXT[] NOT NULL DEFAULT '{}',
    risk_level TEXT NOT NULL CHECK (risk_level IN ('safe', 'low', 'medium', 'high', 'critical')),
    llm_verified BOOLEAN DEFAULT FALSE,
    context TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Optional: link to workspace for context
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL
);

-- Index for analytics queries
CREATE INDEX idx_prompt_injection_attacks_detected_at ON prompt_injection_attacks(detected_at DESC);
CREATE INDEX idx_prompt_injection_attacks_risk_level ON prompt_injection_attacks(risk_level);
CREATE INDEX idx_prompt_injection_attacks_categories ON prompt_injection_attacks USING GIN(categories);
CREATE INDEX idx_prompt_injection_attacks_llm_verified ON prompt_injection_attacks(llm_verified);

-- RLS: Only service role can read/write this table
ALTER TABLE prompt_injection_attacks ENABLE ROW LEVEL SECURITY;

-- No user-level access - this is for system/admin only
-- Access is granted via service role key in edge functions

-- Comment for documentation
COMMENT ON TABLE prompt_injection_attacks IS 'Stores detected prompt injection attacks for training data and security analysis. Inspired by Perplexity BrowseSafe-Bench.';
COMMENT ON COLUMN prompt_injection_attacks.input_text IS 'The sanitized user input that triggered detection (truncated to 2000 chars)';
COMMENT ON COLUMN prompt_injection_attacks.threats IS 'List of detected threat patterns';
COMMENT ON COLUMN prompt_injection_attacks.categories IS 'Attack categories: instruction-override, role-play, system-inject, etc.';
COMMENT ON COLUMN prompt_injection_attacks.risk_level IS 'Risk assessment: safe, low, medium, high, critical';
COMMENT ON COLUMN prompt_injection_attacks.llm_verified IS 'Whether the LLM security scanner confirmed the attack';
COMMENT ON COLUMN prompt_injection_attacks.context IS 'Where the attack was detected: embedded-writer, assistant, etc.';
