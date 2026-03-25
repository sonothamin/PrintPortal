import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify caller's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Verify admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'suspended') {
      return new Response(JSON.stringify({ success: false, error: 'Account suspended. Please contact administrator for resolution.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { user_id, status } = await req.json()
    if (!user_id || !['active', 'suspended'].includes(status)) {
      throw new Error('Invalid user_id or status')
    }

    // 4. Update user status
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status })
      .eq('id', user_id)

    if (error) throw new Error(`Database error: ${error.message}`)

    return new Response(JSON.stringify({ success: true, user_id, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('User status update error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    })
  }
})
