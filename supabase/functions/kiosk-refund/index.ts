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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Verify caller's JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Verify role (admin or kiosk) and suspension status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'suspended') {
      return new Response(JSON.stringify({ success: false, error: 'Account suspended. Please contact administrator.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    if (profile?.role !== 'admin' && profile?.role !== 'kiosk') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: Admin or Kiosk access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { print_job_id } = await req.json()
    if (!print_job_id) throw new Error('Missing print_job_id')

    // 3. Get job info
    const { data: job, error: jobError } = await supabaseAdmin
      .from('print_jobs')
      .select('*, profiles(wallet_balance)')
      .eq('id', print_job_id)
      .single()

    if (jobError || !job) throw new Error('Print job not found')
    
    if (job.status === 'canceled') {
      throw new Error('Job is already canceled.')
    }

    const { user_id, cost, file_name } = job;
    
    if (cost <= 0) {
      throw new Error('This job has no cost to refund.')
    }

    // 4. Perform refund operations atomically
    const { error: balanceError } = await supabaseAdmin.rpc('increment_balance', {
      user_id,
      amount: cost
    })

    if (balanceError) throw new Error(`Balance update error: ${balanceError.message}`)

    // 5. Log the refund transaction
    const { error: transError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id,
        amount: cost,
        type: 'recharge',
        description: `Refund for Print Job: ${file_name} (ID: ${print_job_id})`
      })

    if (transError) throw new Error(`Transaction logging error: ${transError.message}`)

    // 6. Update job status to 'canceled'
    const { error: updateError } = await supabaseAdmin
      .from('print_jobs')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', print_job_id)

    if (updateError) throw new Error(`Job status update error: ${updateError.message}`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Refund processed successfully',
      refunded_amount: cost,
      user_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Kiosk refund error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    })
  }
})
