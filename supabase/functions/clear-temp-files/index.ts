import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // 1. Check User Rights
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Verify Admin Role using Service Role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
      throw new Error('Forbidden: Only administrators can clear temporary files')
    }

    // 3. Purge Temp Folder Recursively
    // Since Supabase storage is flat underneath but simulated as folders:
    // list('temp') returns pseudo-folders (the user IDs)
    const { data: userDirs, error: listErr } = await supabaseAdmin.storage
      .from('documents')
      .list('temp')
    
    if (listErr) throw new Error(`Failed to list temp directory: ${listErr.message}`)
    if (!userDirs || userDirs.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: 'Temp folder is already empty' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    let deletedFilesCount = 0;
    const pathsToDelete: string[] = [];

    // Recursively collect all files inside temp/[user_id]
    for (const dir of userDirs) {
      // Supabase list sometimes returns files if they are directly in 'temp/'
      if (dir.id === null) {
        // It's a prefix/folder
        const { data: files } = await supabaseAdmin.storage
          .from('documents')
          .list(`temp/${dir.name}`)
        
        if (files) {
          for (const file of files) {
            pathsToDelete.push(`temp/${dir.name}/${file.name}`);
          }
        }
      } else {
        // It's a file sitting directly in temp/
        pathsToDelete.push(`temp/${dir.name}`);
      }
    }

    if (pathsToDelete.length > 0) {
      // Remove all gathered paths atomically
      const { data: removed, error: removeErr } = await supabaseAdmin.storage
        .from('documents')
        .remove(pathsToDelete)

      if (removeErr) throw new Error(`Failed to delete files: ${removeErr.message}`)
      deletedFilesCount = removed?.length || 0;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: deletedFilesCount, 
      message: `Successfully purged ${deletedFilesCount} temporary files.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Clear Temp Files error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Unauthorized') || error.message.includes('Forbidden') ? 401 : 200, // Pass 200 so UI can show error
    })
  }
})
