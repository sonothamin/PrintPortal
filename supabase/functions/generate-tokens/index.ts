import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cryptographically secure alphanumeric token generator
function generateTokenCode(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => chars[byte % chars.length]).join('')
}

serve(async (req: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create client with user's JWT for auth verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Verify User JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // 3. Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Verify admin role from public.profiles
    const { data: profile, error: profileError } = await supabaseAdmin
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

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 5. Parse request body
    const { count, value } = await req.json()

    const tokenCount = Math.min(Math.max(Number(count) || 1, 1), 100) // clamp 1-100
    const tokenValue = Number(value)

    if (!tokenValue || tokenValue <= 0) {
      throw new Error('Token value must be a positive number')
    }

    // 6. Generate cryptographically secure tokens
    const generatedTokens: { code: string; value: number; is_used: boolean }[] = []
    const maxRetries = 3

    for (let i = 0; i < tokenCount; i++) {
      let code = ''
      let inserted = false

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        code = generateTokenCode(12)

        // Try inserting (UNIQUE constraint on code will prevent duplicates)
        const { error: insertError } = await supabaseAdmin
          .from('recharge_tokens')
          .insert({ code, value: tokenValue, is_used: false })

        if (!insertError) {
          inserted = true
          break
        }

        // If duplicate, retry with a new code
        if (insertError.code === '23505') {
          console.warn(`Token collision on attempt ${attempt + 1}, regenerating...`)
          continue
        }

        // Other DB error
        throw new Error(`Database error: ${insertError.message}`)
      }

      if (!inserted) {
        throw new Error(`Failed to generate unique token after ${maxRetries} attempts`)
      }

      generatedTokens.push({ code, value: tokenValue, is_used: false })
    }

    return new Response(JSON.stringify({
      success: true,
      count: generatedTokens.length,
      value: tokenValue,
      tokens: generatedTokens
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Generate tokens error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    })
  }
})
