'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Box, Typography, Button, Grid, Divider, LinearProgress,
  IconButton, TextField, MenuItem, Card, CardContent,
  alpha, Alert, CircularProgress
} from '@mui/material';
import { 
  UploadCloud, FileText, X, Printer, 
  ShieldCheck, Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QueuedFile {
  file: File;
  path: string;
  name: string;
  size: string;
  pages: number;
  cost: number;
}

export default function UploadPage() {
  const [activeFile, setActiveFile] = useState<QueuedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [pricing, setPricing] = useState({ mono_price_per_page: 2.00, color_price_per_page: 10.00 });
  const [isColor, setIsColor] = useState(false);
  const [copies, setCopies] = useState(1);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState({ text: '', type: 'info' as 'info' | 'success' | 'error' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Get Pricing
    const { data: setRes } = await supabase.from('settings').select('value').eq('key', 'print_pricing').single();
    if (setRes) setPricing(setRes.value);
    
    // Get Balance (for display only)
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', session.user.id).single();
    if (profile) setBalance(profile.wallet_balance);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setAnalyzing(true);
    setStatus({ text: 'Analyzing document...', type: 'info' });

    try {
      const fileExt = file.name.split('.').pop();
      const tempPath = `temp/${session.user.id}/${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('documents').upload(tempPath, file);
      if (uploadError) throw uploadError;

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-document', {
        body: { file_path: tempPath, is_color: isColor, copies: copies }
      });

      if (verifyError || !verifyData?.success) throw new Error(verifyData?.error || 'Verification failed');

      setActiveFile({
        file,
        path: tempPath,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        pages: Number(verifyData.page_count) || 0,
        cost: Number(verifyData.cost) || 0
      });
      setStatus({ text: 'Document verified and ready.', type: 'success' });
    } catch (err: any) {
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setAnalyzing(false);
      e.target.value = '';
    }
  };

  const handleGeneratePrintJob = async () => {
    if (!activeFile) return;

    setUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-to-queue', {
        body: {
          file_path: activeFile.path,
          file_name: activeFile.name,
          is_color: isColor,
          copies: copies
        }
      });

      if (error || !data.success) throw new Error(error?.message || 'Failed to add to queue');
      
      setStatus({ text: 'Success! Job added to queue.', type: 'success' });
      setActiveFile(null);
      fetchData();
    } catch (err: any) {
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const currentTotalCost = activeFile 
    ? activeFile.pages * (isColor ? pricing.color_price_per_page : pricing.mono_price_per_page) * copies 
    : 0;

  return (
    <DashboardLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Upload Document</Typography>
        <Typography color="text.secondary">Prepare your PDF for the printing queue.</Typography>
      </Box>

      {status.text && <Alert severity={status.type} sx={{ mb: 4, borderRadius: 2 }}>{status.text}</Alert>}

      <Grid container spacing={4}>
        {/* Left Side: Upload Area */}
        <Grid item xs={12} md={7}>
          {!activeFile && !analyzing ? (
            <Box 
              component="label"
              sx={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                p: 8, border: '2px dashed', borderColor: 'divider', borderRadius: 2, 
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
                '&:hover': { borderColor: 'primary.main', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05) },
              }}
            >
              <input type="file" hidden accept=".pdf" onChange={handleFileChange} />
              <UploadCloud size={48} style={{ marginBottom: 16, color: '#999' }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Select PDF File</Typography>
              <Typography variant="body2" color="text.secondary">Files are stored securely until printed</Typography>
            </Box>
          ) : (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    p: 2, borderRadius: 2, 
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), 
                    color: 'primary.main', display: 'flex'
                  }}>
                    {analyzing ? <CircularProgress size={24} color="inherit" /> : <FileText size={24} />}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {analyzing ? 'Reading PDF...' : activeFile?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {analyzing ? 'Calculating pages...' : `${activeFile?.size} • ${activeFile?.pages} Pages`}
                    </Typography>
                  </Box>
                  {!uploading && !analyzing && (
                    <IconButton onClick={() => setActiveFile(null)} size="small">
                      <X size={18} />
                    </IconButton>
                  )}
                </Box>
                {analyzing && <LinearProgress sx={{ mt: 3, borderRadius: 1 }} />}
              </CardContent>
            </Card>
          )}

          <Alert icon={<Info size={20} />} severity="info" sx={{ mt: 3, borderRadius: 2 }}>
            You can upload documents now regardless of your balance. 
            <strong> Payment will be deducted from your wallet only when you release the job at the printer.</strong>
          </Alert>
        </Grid>

        {/* Right Side: Config & Summary */}
        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Print Settings</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    select fullWidth label="Copies" value={copies} 
                    onChange={(e) => setCopies(Number(e.target.value))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    {[1, 2, 3, 5, 10].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </TextField>
                  <TextField 
                    select fullWidth label="Mode" value={isColor ? 'color' : 'bw'} 
                    onChange={(e) => setIsColor(e.target.value === 'color')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    <MenuItem value="bw">B&W</MenuItem>
                    <MenuItem value="color">Color</MenuItem>
                  </TextField>
                </Box>

                <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Estimated Cost</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>৳{currentTotalCost.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Wallet Balance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>৳{balance.toFixed(2)}</Typography>
                  </Box>
                </Box>

                <Button 
                  fullWidth variant="contained" size="large" 
                  disabled={!activeFile || uploading || analyzing}
                  onClick={handleGeneratePrintJob}
                  sx={{ 
                    bgcolor: 'text.primary', color: 'background.default', 
                    py: 2, borderRadius: 2, fontWeight: 800,
                    '&:hover': { bgcolor: 'grey.800' }
                  }}
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <Printer size={22} />}
                >
                  {uploading ? 'Adding to Queue...' : 'Add to Print Queue'}
                </Button>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', opacity: 0.5 }}>
                  <ShieldCheck size={14} />
                  <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                    SECURE PDF PROCESSING
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}