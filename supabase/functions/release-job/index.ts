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

    // Parse requested parameters
    const { job_id, release_code } = await req.json()
    if (!job_id && !release_code) {
      throw new Error('Missing job_id or release_code')
    }

    // Connect as Admin to execute SECURE queries
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
      return new Response(JSON.stringify({ error: 'Account suspended. Please contact administrator for resolution.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    let finalJobId = job_id;
    let job;

    if (release_code) {
      if (release_code.length !== 6) throw new Error('Release code must be exactly 6 characters')

      // Find job by release code regardless of status to determine specific error
      const { data: jobByCode, error: queryError } = await supabaseAdmin
        .from('print_jobs')
        .select('id, user_id, file_path, status, cost')
        .eq('release_code', release_code)
        .single()

      if (queryError || !jobByCode) {
        throw new Error('Invalid release code. Please verify the code and try again.')
      }

      if (jobByCode.status !== 'pending') {
        throw new Error(`This release code has already been redeemed (job status: ${jobByCode.status}).`)
      }

      job = jobByCode;
      finalJobId = job.id;
    } else {
      // Find job by ID
      const { data: jobById, error: jobError } = await supabaseAdmin
        .from('print_jobs')
        .select('id, user_id, file_path, status, cost')
        .eq('id', finalJobId)
        .single()

      if (jobError || !jobById) throw new Error('Print job not found')
      job = jobById;
    }

    // Authorization Check: Must be the owner, or an Admin/Kiosk
    if (job.user_id !== user.id) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin' && profile?.role !== 'kiosk') {
        throw new Error('Forbidden: You do not own this print job')
      }
    }

    // 2. Execute the atomic DB function to deduct balance and log transaction
    // This function automatically verifies the job is pending, checks wallet, deducts, and marks 'processing'
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('release_print_job', {
      job_id: finalJobId
    })

    if (rpcError) throw new Error(`Database error: ${rpcError.message}`)

    if (!rpcResult.success) {
      return new Response(JSON.stringify({ success: false, error: rpcResult.error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Generate a Signed URL for the document (valid for 10 minutes)
    const { data: fileData, error: urlError } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(job.file_path, 600)

    if (urlError || !fileData) {
      throw new Error('Failed to generate secure document URL')
    }

    // 4. Return success and the File URL along with job_id
    return new Response(JSON.stringify({
      success: true,
      new_balance: rpcResult.new_balance,
      file_url: fileData.signedUrl,
      job_id: finalJobId  // Add job_id here
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Release job error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Unauthorized') || error.message.includes('Forbidden') ? 401 : 200,
    })
  }
})
