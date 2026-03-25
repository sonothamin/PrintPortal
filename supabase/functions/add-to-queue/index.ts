import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get User
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { file_path, file_name, is_color, copies } = await req.json()
    if (!file_path || !file_name) throw new Error('Missing file data')

    // Use Service Role for DB operations that bypass RLS or need higher privilege
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check suspension status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'suspended') {
      return new Response(JSON.stringify({ error: 'Account suspended. Please contact administrator for resolution.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 2. Re-verify document (Final Check)
    const { data: pricingRes } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'print_pricing')
      .single()

    const pricing = pricingRes?.value || { mono_price_per_page: 2, color_price_per_page: 10 }

    const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
      .from('documents')
      .download(file_path)

    if (downloadErr || !fileData) throw new Error(`Failed to verify document in storage: ${downloadErr?.message}`)

    const arrayBuffer = await fileData.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const realPageCount = pdfDoc.getPageCount()

    const price = is_color ? pricing.color_price_per_page : pricing.mono_price_per_page
    const realCost = realPageCount * (copies || 1) * price

    // Balance check is deferred to release-job for atomic fulfillment

    // 4. Secure the File (Move out of temp/ so clear-temp-files doesn't delete it)
    const fileExt = file_path.split('.').pop() || 'pdf'
    const permanentPath = `jobs/${user.id}/${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: moveErr } = await supabaseAdmin.storage
      .from('documents')
      .move(file_path, permanentPath)

    if (moveErr) throw new Error(`Failed to secure document: ${moveErr.message}`)

    // 5. Create Job
    const releaseCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: job, error: jobError } = await supabaseAdmin
      .from('print_jobs')
      .insert({
        user_id: user.id,
        file_name: file_name,
        file_path: permanentPath,
        page_count: realPageCount,
        copies: copies || 1,
        is_color: is_color,
        cost: realCost,
        release_code: releaseCode,
        status: 'pending' // Created as verified
      })
      .select()
      .single()

    if (jobError) throw jobError

    return new Response(JSON.stringify({
      success: true,
      job_id: job.id,
      release_code: releaseCode,
      cost: realCost
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
