import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcceptInviteRequest {
  token: string
  password?: string
  name?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client (service role for user creation)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const requestBody = await req.json()
    const { token, password, name } = requestBody as AcceptInviteRequest

    console.log('Accept invitation request:', { token: token?.substring(0, 10) + '...', hasPassword: !!password, hasName: !!name })

    if (!token) {
      console.error('No token provided')
      throw new Error('Invitation token is required')
    }

    // Look up the invitation
    console.log('Looking up invitation with token:', token)
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('workspace_invitations')
      .select(`
        *,
        workspace:workspace_id (
          id,
          name,
          owner_id
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    console.log('Invitation lookup result:', { invitation, inviteError })

    if (inviteError || !invitation) {
      console.error('Invitation lookup error:', inviteError)
      
      // Check if invitation exists but is not pending
      const { data: anyInvite } = await supabaseAdmin
        .from('workspace_invitations')
        .select('id, email, status, expires_at')
        .eq('token', token)
        .single()
      
      console.log('Any invitation with this token:', anyInvite)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: anyInvite ? `Invitation is ${anyInvite.status}` : 'Invalid or expired invitation',
          needsAuth: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This invitation has expired',
          needsAuth: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // CRITICAL: Mark invitation as 'processing' BEFORE creating user
    // This ensures the database trigger can see it and skip workspace creation
    await supabaseAdmin
      .from('workspace_invitations')
      .update({ status: 'processing' })
      .eq('id', invitation.id)

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === invitation.email)

    let userId: string
    let isNewUser = false
    let tempPassword: string | undefined

    if (existingUser) {
      // User exists - check if they're already a member
      const { data: existingMember } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', invitation.workspace_id)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember) {
        // Update invitation status to accepted
        await supabaseAdmin
          .from('workspace_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitation.id)

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'You are already a member of this workspace',
            workspace_name: invitation.workspace?.name,
            needsAuth: true,
            email: invitation.email
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      userId = existingUser.id
    } else {
      // Create new user account
      isNewUser = true
      tempPassword = password || generateRandomPassword()

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: name || invitation.email.split('@')[0],
          invited_to_workspace: invitation.workspace_id
        }
      })

      if (createError) {
        console.error('User creation error:', createError)
        
        // Check if error is because user already exists
        if (createError.message?.includes('already registered') || 
            createError.message?.includes('User already exists')) {
          // Fetch the existing user and continue
          const { data: existingUsers2 } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser2 = existingUsers2?.users?.find(u => u.email === invitation.email)
          
          if (existingUser2) {
            userId = existingUser2.id
            isNewUser = false // User already exists, just add to workspace
          } else {
            throw new Error('Failed to create user account')
          }
        } else {
          throw new Error('Failed to create user account')
        }
      } else if (newUser.user) {
        userId = newUser.user.id

        // Wait a moment for the handle_new_user trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Check if profile was created by trigger, if not create it
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single()

        if (!existingProfile) {
          // Profile doesn't exist yet, create it
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: userId,
              email: invitation.email,
              full_name: name || invitation.email.split('@')[0]
            })

          if (profileError) {
            console.error('Error creating profile:', profileError)
            // Don't throw - profile might have been created by trigger in the meantime
            // Check one more time
            const { data: profileCheck } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .single()
            
            if (!profileCheck) {
              throw new Error('Failed to create user profile')
            }
          }
        }
      } else {
        throw new Error('Failed to create user account')
      }
    }

    // Add user to workspace
    console.log('Adding user to workspace:', {
      workspace_id: invitation.workspace_id,
      user_id: userId,
      role: invitation.role,
      invited_by: invitation.invited_by
    })
    
    // Only include invited_by if it exists and the inviter has a profile
    const memberData: any = {
      workspace_id: invitation.workspace_id,
      user_id: userId,
      role: invitation.role
    }
    
    // Check if inviter has a profile before adding invited_by
    if (invitation.invited_by) {
      const { data: inviterProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', invitation.invited_by)
        .single()
      
      if (inviterProfile) {
        memberData.invited_by = invitation.invited_by
      } else {
        console.warn('Inviter does not have a profile, skipping invited_by field')
      }
    }
    
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .insert(memberData)

    if (memberError) {
      console.error('Error adding workspace member:', memberError)
      console.error('Member error details:', JSON.stringify(memberError, null, 2))
      throw new Error(`Failed to add you to the workspace: ${memberError.message}`)
    }

    // Update invitation status
    await supabaseAdmin
      .from('workspace_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    // If new user, send invite email using Supabase's built-in email service
    let passwordResetSent = false
    if (isNewUser) {
      try {
        console.log('Sending invite email to new user:', invitation.email)
        
        // Use inviteUserByEmail which sends a magic link to set password
        // This works better for newly created users who don't have a password yet
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          invitation.email,
          {
            redirectTo: `${Deno.env.get('APP_URL') || 'http://localhost:3000'}/app`
          }
        )
        
        if (inviteError) {
          console.error('Error sending invite email:', inviteError)
          console.error('Invite error details:', JSON.stringify(inviteError, null, 2))
          console.error('Make sure SMTP is configured in Supabase Dashboard > Project Settings > Auth > SMTP Settings')
        } else {
          passwordResetSent = true
          console.log('✅ Invite email sent successfully to:', invitation.email)
        }
      } catch (error) {
        console.error('Exception sending invite email:', error)
        console.error('Exception details:', error instanceof Error ? error.stack : error)
      }
    }

    // Log the final result before sending response
    console.log('Invitation acceptance complete:', {
      isNewUser,
      passwordResetSent,
      workspace: invitation.workspace?.name,
      email: invitation.email
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isNewUser 
          ? `Account created! You've been added to ${invitation.workspace?.name}` 
          : `Successfully joined ${invitation.workspace?.name}!`,
        workspace_name: invitation.workspace?.name,
        workspace_id: invitation.workspace_id,
        isNewUser,
        needsAuth: !isNewUser, // Existing users need to log in
        email: invitation.email,
        passwordResetSent: isNewUser && passwordResetSent,
        // Note: tempPassword no longer returned for security
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to accept invitation'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

function generateRandomPassword(): string {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
