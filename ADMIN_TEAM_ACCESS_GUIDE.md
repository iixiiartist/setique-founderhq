# Admin Team/Workspace Access Guide

## 🎯 Your Current Admin Setup

You are now an **admin user** with the following benefits:

✅ **Unlimited AI requests** - No usage limits
✅ **Bypass all subscription checks** - Full feature access  
✅ **Admin banner** - Shows unlimited status in UI
✅ **Database flag** - `profiles.is_admin = TRUE`

## 🏢 Accessing Team Features

### Current Status
- **User**: joe@setique.com (`f8722baa-9f38-44bf-81ef-ec167dc135c3`)
- **Workspace ID**: `08aa7e67-a131-443a-b46f-5f53a4013f0c`
- **Current Plan**: `free` (single user)

### Option 1: View Teams as Admin (No DB Change) ✅

**What I Did**:
1. Updated `SubscriptionBanner.tsx` to detect admin status
2. Admin users see special banner:
   - 👑 "Admin Access" with UNLIMITED badge
   - "∞ AI • ∞ Storage • ∞ Files"
   - Purple gradient styling

**How to Test**:
1. Refresh your browser (F5)
2. Go to Settings tab
3. You should see the new admin banner instead of "Free Plan"

### Option 2: Upgrade to Team Plan (Full Team Features)

If you want to test actual team/workspace features like:
- Multiple team members
- Team achievements
- Workspace switching
- Member management

**Run this SQL**:
```sql
UPDATE workspaces 
SET plan_type = 'team-pro'
WHERE owner_id = 'f8722baa-9f38-44bf-81ef-ec167dc135c3';
```

This will:
- ✅ Change your workspace to "Team Pro" plan
- ✅ Enable multi-user features
- ✅ Show unlimited seats
- ✅ Unlock all team functionality

**To Apply**:
The SQL file is already created at: `upgrade_workspace_to_team.sql`

## 🔍 What Admin Status Gives You

### 1. AI Usage (Already Working ✅)
- **File**: `lib/services/database.ts`
- **Function**: `checkAILimit()`
- **Behavior**: Returns `allowed: true, limit: 999999` for admins
- **Console**: Shows `[Database] Admin user detected - bypassing AI limits`

### 2. Subscription Banner (Just Added ✅)
- **File**: `components/SubscriptionBanner.tsx`  
- **Behavior**: Shows admin badge instead of plan limits
- **UI**: Purple gradient banner with crown emoji 👑

### 3. What You Can Do Now

**Without Changing Plan** (as admin):
- Send unlimited AI messages
- No rate limiting enforcement
- See admin banner in Settings
- Bypass AI usage checks

**If You Upgrade to team-pro**:
- Invite other users to workspace
- Test team achievements
- See workspace switching
- Test member management
- View team analytics

## 📋 Team Feature Locations

### Where Team Features Live:

**1. Workspace Context** (`contexts/WorkspaceContext.tsx`)
- Loads user's workspaces
- Handles workspace switching
- Manages business profile

**2. Team Achievements** (`lib/services/gamificationService.ts`)
- `TeamAchievementService` class
- Tracks team XP and levels
- Unlocks team achievements

**3. Workspace Members** (Database)
- Table: `workspace_members`
- Shows who's in the workspace
- Roles: owner, member

**4. Database Functions**
- `getWorkspaceMembers()` - List team members
- `addWorkspaceMember()` - Invite users
- `removeWorkspaceMember()` - Remove users
- `updateWorkspaceMemberRole()` - Change roles

## 🚀 Quick Start

### Step 1: See Admin Banner
```bash
# Just refresh browser
# Should see purple admin banner in Settings tab
```

### Step 2: Test Unlimited AI
```bash
# Send 100+ AI messages
# Console should show "Admin user detected"
# No limits or warnings
```

### Step 3: Upgrade to Team (Optional)
```bash
# If you want full team features:
# Run the upgrade_workspace_to_team.sql file
# This sets plan_type = 'team-pro'
```

## 🎨 Admin UI Elements

### Admin Banner (Settings Tab)
```
┌─────────────────────────────────────────────────┐
│ 👑 Admin Access [UNLIMITED]                     │
│ You have full access to all features with no    │
│ limits                          ∞ AI • ∞ Storage│
└─────────────────────────────────────────────────┘
```

### Console Messages
```
[Database] Admin user detected - bypassing AI limits
[Database] AI Limit Check: 0/999999 (admin), Allowed: true
```

## 🔧 Technical Details

### Admin Check Flow

1. **User logs in** → User ID: `f8722baa-9f38-44bf-81ef-ec167dc135c3`
2. **Component loads** → `SubscriptionBanner` renders
3. **Check admin** → Query `profiles.is_admin`
4. **If admin = true**:
   - Show purple admin banner
   - Skip subscription limits
   - Return unlimited values
5. **If admin = false**:
   - Show normal plan banner
   - Enforce subscription limits
   - Show usage bars

### Database Schema

**profiles table**:
```sql
id UUID PRIMARY KEY
email TEXT
is_admin BOOLEAN DEFAULT FALSE  ← Your flag
```

**workspaces table**:
```sql
id UUID PRIMARY KEY
owner_id UUID → profiles(id)
plan_type plan_type  ← 'free', 'team-pro', etc.
```

**subscriptions table**:
```sql
workspace_id UUID
plan_type plan_type
ai_requests_used INTEGER
ai_requests_limit INTEGER
```

## 📊 Admin vs Regular User

| Feature | Regular User | Admin User |
|---------|-------------|------------|
| AI Requests | 20/50/200 limit | ∞ Unlimited |
| Rate Limiting | 10/min enforced | Bypassed |
| Subscription Banner | Shows usage bars | Shows admin badge |
| Console Messages | Usage warnings | "Admin detected" |
| Plan Type Display | Free/Pro/Team | "Admin" |
| Storage Limits | Plan-based | Unlimited |
| File Limits | Plan-based | Unlimited |

## 🧪 Testing Scenarios

### Test 1: Admin Banner
1. Go to Settings tab
2. Should see purple banner with 👑
3. Should say "Admin Access"
4. Should show "∞" symbols

### Test 2: Unlimited AI
1. Send 50+ AI messages rapidly
2. Should all go through
3. Check console for "Admin detected"
4. No yellow limit warning

### Test 3: Rate Limit Bypass
1. Send 20 messages in 10 seconds
2. Should not trigger rate limit
3. Orange banner should not appear
4. All messages process

### Test 4: Workspace Upgrade (Optional)
1. Run SQL to set `plan_type = 'team-pro'`
2. Refresh browser
3. Settings should show "Team Pro" plan
4. Can invite members (if implemented)

## 📝 Files Modified

1. **`supabase/migrations/20251102070000_add_admin_functionality.sql`**
   - Added `is_admin` column
   - Set your user as admin

2. **`lib/services/database.ts`**
   - Updated `checkAILimit()` to check admin status
   - Returns unlimited for admins

3. **`components/SubscriptionBanner.tsx`**
   - Added admin status check
   - Shows special admin banner
   - Bypasses usage display

4. **`upgrade_workspace_to_team.sql`** (optional)
   - SQL to upgrade workspace to team-pro
   - Enables full team features

## ✅ Summary

**You Are Admin**: Yes ✅  
**Unlimited AI**: Yes ✅  
**Admin Banner**: Yes ✅  
**Team Features**: Optional (run SQL to enable)

**Current State**:
- Admin flag set in database
- AI limits bypassed
- Special UI badge shown
- Full access granted

**To Enable Team Features**:
- Run `upgrade_workspace_to_team.sql`
- Sets workspace to team-pro plan
- Unlocks member management
- Shows team achievements

**Next Steps**:
1. Refresh browser
2. Check Settings for admin banner
3. Test unlimited AI
4. (Optional) Run team upgrade SQL

You're all set! 🚀
