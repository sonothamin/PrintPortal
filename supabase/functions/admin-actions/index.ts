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

    const { action, ...payload } = await req.json()

    // ── ACTION: update-balance ──────────────────────────────────────
    if (action === 'update-balance') {
      const { user_id, new_balance } = payload
      if (!user_id || typeof new_balance !== 'number' || new_balance < 0) {
        throw new Error('Invalid user_id or new_balance')
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: new_balance })
        .eq('id', user_id)

      if (error) throw new Error(`Database error: ${error.message}`)

      return new Response(JSON.stringify({ success: true, user_id, new_balance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── ACTION: update-settings ─────────────────────────────────────
    if (action === 'update-settings') {
      const { pricing } = payload
      if (!pricing || typeof pricing !== 'object') {
        throw new Error('Invalid pricing object')
      }

      // Validate all pricing fields are non-negative numbers
      const requiredFields = ['mono_price_per_page', 'color_price_per_page', 'mono_cost_per_page', 'color_cost_per_page']
      for (const field of requiredFields) {
        if (typeof pricing[field] !== 'number' || pricing[field] < 0) {
          throw new Error(`Invalid value for ${field}`)
        }
      }

      const { error } = await supabaseAdmin
        .from('settings')
        .update({ value: pricing, updated_at: new Date().toISOString() })
        .eq('key', 'print_pricing')

      if (error) throw new Error(`Database error: ${error.message}`)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── ACTION: delete-token ────────────────────────────────────────
    if (action === 'delete-token') {
      const { token_id } = payload
      if (!token_id) throw new Error('Missing token_id')

      // Only allow deleting unused tokens
      const { data: token } = await supabaseAdmin
        .from('recharge_tokens')
        .select('is_used')
        .eq('id', token_id)
        .single()

      if (!token) throw new Error('Token not found')
      if (token.is_used) throw new Error('Cannot delete a used token')

      const { error } = await supabaseAdmin
        .from('recharge_tokens')
        .delete()
        .eq('id', token_id)

      if (error) throw new Error(`Database error: ${error.message}`)

      return new Response(JSON.stringify({ success: true, deleted_id: token_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (error: any) {
    console.error('Admin action error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    })
  }
})
