-- Migration: Add Team Achievements Schema
-- Date: 2025-11-01
-- Description: Adds team achievements system for workspace gamification

-- Create workspace_achievements table to track team achievements
CREATE TABLE IF NOT EXISTS workspace_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unlocked_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Metadata for achievement progress/state
    metadata JSONB DEFAULT '{}',
    
    -- Ensure a workspace can only unlock an achievement once
    UNIQUE(workspace_id, achievement_id)
);

-- Create indexes for workspace_achievements
CREATE INDEX IF NOT EXISTS idx_workspace_achievements_workspace_id ON workspace_achievements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_achievements_achievement_id ON workspace_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_workspace_achievements_unlocked_at ON workspace_achievements(unlocked_at);

-- Enable RLS on workspace_achievements table
ALTER TABLE workspace_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workspace_achievements
DROP POLICY IF EXISTS "Users can view achievements of their workspaces" ON workspace_achievements;
CREATE POLICY "Users can view achievements of their workspaces" ON workspace_achievements 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = workspace_achievements.workspace_id 
            AND (
                workspaces.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM workspace_members 
                    WHERE workspace_members.workspace_id = workspace_achievements.workspace_id 
                    AND workspace_members.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "System can insert achievements" ON workspace_achievements;
CREATE POLICY "System can insert achievements" ON workspace_achievements 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = workspace_achievements.workspace_id 
            AND (
                workspaces.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM workspace_members 
                    WHERE workspace_members.workspace_id = workspace_achievements.workspace_id 
                    AND workspace_members.user_id = auth.uid()
                )
            )
        )
    );

-- Add team achievement fields to workspaces table
DO $$ BEGIN
    ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS team_xp INTEGER DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS team_level INTEGER DEFAULT 1;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create indexes for team gamification
CREATE INDEX IF NOT EXISTS idx_workspaces_team_level ON workspaces(team_level);

COMMENT ON TABLE workspace_achievements IS 'Team achievements unlocked by workspaces';
COMMENT ON COLUMN workspace_achievements.achievement_id IS 'Achievement identifier (e.g., "team_first_member", "revenue_100k")';
COMMENT ON COLUMN workspace_achievements.metadata IS 'Additional data like progress, values at unlock, etc.';
COMMENT ON COLUMN workspaces.team_xp IS 'Team experience points for gamification';
COMMENT ON COLUMN workspaces.team_level IS 'Team level based on XP';

-- Team Achievement Definitions (stored as comments for reference)
-- These will be implemented in the application code

/*
TEAM BUILDING ACHIEVEMENTS (6):
1. "team_first_member" - Welcome Aboard! - Invite your first team member
2. "team_5_members" - Growing Team - Reach 5 team members
3. "team_10_members" - Dream Team - Reach 10 team members
4. "team_first_week" - Week One - Team active for 7 days
5. "team_first_month" - Monthly Milestone - Team active for 30 days
6. "team_first_year" - Anniversary - Team active for 365 days

COLLABORATION ACHIEVEMENTS (5):
7. "collab_10_shared_tasks" - Task Master - Complete 10 shared tasks as a team
8. "collab_50_shared_tasks" - Collaboration Champion - Complete 50 shared tasks
9. "collab_10_meetings" - Meeting Mavens - Log 10 team meetings
10. "collab_shared_contact" - Connected - Share your first contact with the team
11. "collab_shared_deal" - Deal Flow - Share your first deal with the team

FINANCIAL ACHIEVEMENTS (5):
12. "finance_10k_gmv" - First $10K GMV - Reach $10,000 in GMV as a team
13. "finance_100k_gmv" - Six Figures! - Reach $100,000 in GMV
14. "finance_1m_gmv" - Million Dollar Team - Reach $1,000,000 in GMV
15. "finance_10k_mrr" - Recurring Revenue - Reach $10,000 MRR
16. "finance_expense_tracking" - Budget Conscious - Track 50 team expenses

PRODUCTIVITY ACHIEVEMENTS (5):
17. "productivity_100_tasks" - Century Club - Complete 100 tasks as a team
18. "productivity_500_tasks" - Task Force - Complete 500 tasks
19. "productivity_daily_streak_7" - Week Warrior - 7-day team activity streak
20. "productivity_daily_streak_30" - Monthly Momentum - 30-day team activity streak
21. "productivity_10_documents" - Documentation Masters - Upload 10 shared documents

ENGAGEMENT ACHIEVEMENTS (4):
22. "engage_all_active_week" - All Hands - All team members active in one week
23. "engage_ai_power_users" - AI Enthusiasts - Team uses 1000 AI sessions
24. "engage_marketing_launch" - Launch Party - Complete first marketing campaign as team
25. "engage_crm_100_contacts" - Network Effect - Reach 100 CRM contacts as team

XP REWARDS BY ACHIEVEMENT TIER:
- Tier 1 (First milestones): 100 XP
- Tier 2 (Growth milestones): 250 XP
- Tier 3 (Major milestones): 500 XP
- Tier 4 (Epic milestones): 1000 XP

TEAM LEVEL THRESHOLDS:
- Level 1: 0 XP
- Level 2: 500 XP
- Level 3: 1,500 XP
- Level 4: 3,500 XP
- Level 5: 7,000 XP
- Level 6: 12,000 XP
- Level 7: 18,500 XP
- Level 8: 27,000 XP
- Level 9: 37,500 XP
- Level 10: 50,000 XP
*/

