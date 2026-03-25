import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify User JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // Parse requested token
    const { token_code } = await req.json()
    if (!token_code || typeof token_code !== 'string') {
      throw new Error('Invalid token code format')
    }

    // Connect as Admin (Service Role) to execute the DB function securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check suspension status
    const { data: profileStatus } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    if (profileStatus?.status === 'suspended') {
      return new Response(JSON.stringify({ success: false, error: 'Account suspended. Please contact administrator for resolution.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Call atomic redemption function
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('redeem_token_atomic', {
      p_token_code: token_code.trim().toUpperCase(),
      p_user_id: user.id
    })

    if (rpcError) throw new Error(`Database error: ${rpcError.message}`)

    if (!result.success) {
      return new Response(JSON.stringify({ success: false, error: result.error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({
      success: true,
      new_balance: result.new_balance,
      amount_added: result.amount_added
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Redeem token error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
