import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Import the task reminder functions
// Note: In production, you'd need to adjust these imports to work with Deno
// For now, this shows the structure - you may need to copy the functions here

interface Workspace {
  id: string;
  name: string;
}

interface ReminderStats {
  workspaceId: string;
  workspaceName: string;
  dueSoonCount: number;
  overdueCount: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔔 Starting task reminder check...')

    // Fetch all workspaces
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (workspacesError) {
      throw new Error(`Failed to fetch workspaces: ${workspacesError.message}`)
    }

    if (!workspaces || workspaces.length === 0) {
      console.log('No workspaces found')
      return new Response(
        JSON.stringify({ message: 'No workspaces found', stats: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${workspaces.length} workspaces to check`)

    const stats: ReminderStats[] = []

    // Check each workspace
    for (const workspace of workspaces) {
      console.log(`Checking workspace: ${workspace.name} (${workspace.id})`)

      // Check for tasks due soon (within 24 hours)
      const tomorrow = new Date()
      tomorrow.setHours(tomorrow.getHours() + 24)
      const today = new Date()

      const { data: dueSoonTasks, error: dueSoonError } = await supabase
        .from('tasks')
        .select('id, text, due_date, assigned_to, user_id')
        .eq('workspace_id', workspace.id)
        .neq('status', 'Done')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', tomorrow.toISOString().split('T')[0])

      if (dueSoonError) {
        console.error(`Error fetching due soon tasks: ${dueSoonError.message}`)
        continue
      }

      // Check for overdue tasks
      const { data: overdueTasks, error: overdueError } = await supabase
        .from('tasks')
        .select('id, text, due_date, assigned_to, user_id')
        .eq('workspace_id', workspace.id)
        .neq('status', 'Done')
        .lt('due_date', today.toISOString().split('T')[0])

      if (overdueError) {
        console.error(`Error fetching overdue tasks: ${overdueError.message}`)
        continue
      }

      let dueSoonCount = 0
      let overdueCount = 0

      // Send due soon notifications
      if (dueSoonTasks && dueSoonTasks.length > 0) {
        for (const task of dueSoonTasks) {
          const userId = task.assigned_to || task.user_id
          if (!userId) continue

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              workspace_id: workspace.id,
              type: 'task_due_soon',
              title: 'Task due soon',
              message: `Task "${task.text}" is due within 24 hours`,
              entity_type: 'task',
              entity_id: task.id,
              created_at: new Date().toISOString(),
            })

          if (notifError) {
            console.error(`Failed to create due soon notification: ${notifError.message}`)
          } else {
            dueSoonCount++
          }
        }
      }

      // Send overdue notifications
      if (overdueTasks && overdueTasks.length > 0) {
        for (const task of overdueTasks) {
          const userId = task.assigned_to || task.user_id
          if (!userId) continue

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              workspace_id: workspace.id,
              type: 'task_overdue',
              title: 'Task overdue',
              message: `Task "${task.text}" is overdue`,
              entity_type: 'task',
              entity_id: task.id,
              created_at: new Date().toISOString(),
            })

          if (notifError) {
            console.error(`Failed to create overdue notification: ${notifError.message}`)
          } else {
            overdueCount++
          }
        }
      }

      console.log(`  ✅ Workspace ${workspace.name}: ${dueSoonCount} due soon, ${overdueCount} overdue`)
      
      stats.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        dueSoonCount,
        overdueCount,
      })
    }

    const totalDueSoon = stats.reduce((sum, s) => sum + s.dueSoonCount, 0)
    const totalOverdue = stats.reduce((sum, s) => sum + s.overdueCount, 0)

    console.log(`🎉 Task reminder check complete. Total: ${totalDueSoon} due soon, ${totalOverdue} overdue`)

    return new Response(
      JSON.stringify({
        message: 'Task reminders checked successfully',
        totalNotifications: totalDueSoon + totalOverdue,
        dueSoon: totalDueSoon,
        overdue: totalOverdue,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('❌ Error in check-task-reminders function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
