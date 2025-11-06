import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const payload = await req.json()
    
    // Only handle user.created events
    if (payload.type === 'INSERT' && payload.table === 'users') {
      const user = payload.record
      
      // Generate confirmation URL
      const confirmationUrl = `${Deno.env.get('APP_URL')}/auth/confirm?token=${user.confirmation_token}&email=${encodeURIComponent(user.email)}`
      
      // Send confirmation email via Resend
      const response = await fetch(`${supabaseUrl}/functions/v1/send-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          email: user.email,
          confirmationUrl: confirmationUrl,
          fullName: user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name,
        }),
      })

      if (!response.ok) {
        console.error('Failed to send confirmation email:', await response.text())
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
