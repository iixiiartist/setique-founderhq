import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptInvitationPayload {
  token: string;
}

interface AcceptInvitationResult {
  success: boolean;
  message?: string;
  error?: string;
  workspace_name?: string;
  workspace_id?: string;
  isNewUser?: boolean;
  needsAuth?: boolean;
  email?: string;
  tempPassword?: string;
}

// Generate a secure temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  for (let i = 0; i < 16; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    const payload: AcceptInvitationPayload = await req.json();
    const { token } = payload;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing invitation token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[accept-invitation] Processing token:', token.substring(0, 8) + '...');

    // Look up the invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('workspace_invitations')
      .select('*, workspaces(name)')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      console.error('[accept-invitation] Invitation not found:', inviteError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invitation is expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invitation is already used
    if (invitation.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: 'This invitation has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const workspaceName = (invitation.workspaces as any)?.name || 'Workspace';
    const inviteeEmail = invitation.email;
    const workspaceId = invitation.workspace_id;
    const role = invitation.role || 'member';

    console.log('[accept-invitation] Invitation valid for:', inviteeEmail, 'to workspace:', workspaceName);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === inviteeEmail.toLowerCase()
    );

    if (existingUser) {
      console.log('[accept-invitation] User exists:', existingUser.id);
      
      // Check if already a member
      const { data: existingMember } = await supabaseAdmin
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        // Already a member - mark invitation as accepted and return success
        await supabaseAdmin
          .from('workspace_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'You are already a member of this workspace',
            workspace_name: workspaceName,
            workspace_id: workspaceId,
            needsAuth: true,
            email: inviteeEmail
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // User exists but not a member - add them and require login
      const { error: memberError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: existingUser.id,
          role: role,
          invited_by: invitation.invited_by
        });

      if (memberError) {
        console.error('[accept-invitation] Error adding member:', memberError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to add you to the workspace' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update used_seats in subscription
      await supabaseAdmin.rpc('increment_used_seats', { p_workspace_id: workspaceId });

      // Mark invitation as accepted
      await supabaseAdmin
        .from('workspace_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      console.log('[accept-invitation] Existing user added to workspace');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'You have been added to the workspace. Please log in.',
          workspace_name: workspaceName,
          workspace_id: workspaceId,
          needsAuth: true,
          email: inviteeEmail
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // New user - create account with temporary password
    console.log('[accept-invitation] Creating new user for:', inviteeEmail);
    
    const tempPassword = generateTempPassword();
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: inviteeEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since they clicked the invite link
      user_metadata: {
        invited_to_workspace: workspaceId,
        invitation_token: token
      }
    });

    if (createError || !newUser.user) {
      console.error('[accept-invitation] Error creating user:', createError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create your account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[accept-invitation] User created:', newUser.user.id);

    // Create profile for new user
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: inviteeEmail,
        full_name: inviteeEmail.split('@')[0], // Use email prefix as initial name
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Add user to workspace
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: newUser.user.id,
        role: role,
        invited_by: invitation.invited_by
      });

    if (memberError) {
      console.error('[accept-invitation] Error adding new member:', memberError);
      // Don't fail - user is created, they can be added later
    }

    // Update used_seats in subscription
    await supabaseAdmin.rpc('increment_used_seats', { p_workspace_id: workspaceId }).catch(() => {
      console.log('[accept-invitation] increment_used_seats RPC not available, skipping');
    });

    // Mark invitation as accepted
    await supabaseAdmin
      .from('workspace_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    console.log('[accept-invitation] New user setup complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created! Please set your password.',
        workspace_name: workspaceName,
        workspace_id: workspaceId,
        isNewUser: true,
        email: inviteeEmail,
        tempPassword: tempPassword
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[accept-invitation] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
