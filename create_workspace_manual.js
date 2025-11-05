// Quick fix script to create workspace for test user
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jffnzpdcmdalxqhkfymx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZm56cGRjbWRhbHhxaGtmeW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc5MTc1MiwiZXhwIjoyMDc3MzY3NzUyfQ.c9CqNhDVXNP7BOKJMmC1VjXqMWMqfWU2cHW2b0wLKD8'; // You'll need to get this from Supabase dashboard

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createWorkspaceForUser() {
    const userId = 'f8722baa-9f38-44bf-81ef-ec167dc135c3';
    
    // 1. Check if workspace already exists
    const { data: existing } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', userId);
    
    console.log('Existing workspaces:', existing);
    
    if (existing && existing.length > 0) {
        console.log('Workspace already exists!');
        return;
    }
    
    // 2. Create profile if needed
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
            id: userId, 
            email: 'test@example.com',
            created_at: new Date().toISOString()
        });
    
    if (profileError) console.error('Profile error:', profileError);
    
    // 3. Create workspace
    const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
            owner_id: userId,
            name: 'My Workspace',
            plan_type: 'free',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (workspaceError) {
        console.error('Workspace error:', workspaceError);
        return;
    }
    
    console.log('Created workspace:', workspace);
    
    // 4. Add as member
    const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
            workspace_id: workspace.id,
            user_id: userId,
            role: 'owner',
            joined_at: new Date().toISOString()
        });
    
    if (memberError) console.error('Member error:', memberError);
    
    // 5. Create subscription
    const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
            workspace_id: workspace.id,
            plan_type: 'free',
            status: 'active',
            seat_count: 1,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });
    
    if (subError) console.error('Subscription error:', subError);
    
    console.log('✅ Workspace setup complete!');
}

createWorkspaceForUser();
