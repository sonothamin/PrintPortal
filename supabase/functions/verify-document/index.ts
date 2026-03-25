import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib'

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
    // Create client with user's JWT for auth verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify User JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // Parse request body
    const { file_path, is_color, copies } = await req.json()

    if (!file_path) {
      throw new Error('Missing file_path')
    }

    const targetIsColor = is_color ?? false
    const targetCopies = copies ?? 1

    // Create admin client for privileged operations
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
        status: 403,
      })
    }

    // 1. Fetch Pricing
    const { data: pricingRes } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'print_pricing')
      .single()

    const pricing = pricingRes?.value || { mono_price_per_page: 2, color_price_per_page: 10 }

    // 2. Download File from Storage
    const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
      .from('documents')
      .download(file_path)

    if (downloadErr || !fileData) throw new Error('Failed to download file from Storage')

    // 3. Verify PDF and count pages
    const arrayBuffer = await fileData.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const realPageCount = pdfDoc.getPageCount()

    // 4. Calculate Real Cost (server-authoritative)
    const price = targetIsColor ? pricing.color_price_per_page : pricing.mono_price_per_page
    const realCost = realPageCount * targetCopies * price

    return new Response(JSON.stringify({ 
      success: true, 
      page_count: realPageCount,
      cost: realCost,
      is_color: targetIsColor,
      copies: targetCopies
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Verify document error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    })
  }
})
