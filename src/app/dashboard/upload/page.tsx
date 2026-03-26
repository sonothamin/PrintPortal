'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Box, Typography, Button, Grid2 as Grid, Divider, LinearProgress,
  IconButton, TextField, MenuItem, Card, CardContent,
  alpha, Alert, CircularProgress
} from '@mui/material';
import { 
  UploadCloud, FileText, X, Printer, 
  ShieldCheck, CheckCircle2 
} from 'lucide-react'; // Added CheckCircle2
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
    
    const { data: setRes } = await supabase.from('settings').select('value').eq('key', 'print_pricing').single();
    if (setRes) setPricing(setRes.value);
    
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', session.user.id).single();
    if (profile) setBalance(profile.wallet_balance);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setAnalyzing(true);
    setStatus({ text: 'Uploading and analyzing document...', type: 'info' });

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
      setStatus({ text: 'Document verified. Ready to print.', type: 'success' });
    } catch (err: any) {
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setAnalyzing(false);
      // Reset input so the same file can be re-selected if cleared
      e.target.value = '';
    }
  };

  const clearFile = () => {
    setActiveFile(null);
    setStatus({ text: '', type: 'info' });
  };

  const handleGeneratePrintJob = async () => {
    if (!activeFile) return;
    if (balance < currentTotalCost) {
      setStatus({ text: 'Insufficient wallet balance.', type: 'error' });
      return;
    }

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
        <Typography color="text.secondary">Send one PDF at a time for processing.</Typography>
      </Box>

      {status.text && <Alert severity={status.type} sx={{ mb: 4, borderRadius: 2 }}>{status.text}</Alert>}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          {!activeFile && !analyzing ? (
            <Box 
              component="label"
              sx={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                p: 8, border: '2px dashed', borderColor: 'divider', borderRadius: 2, 
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                '&:hover': { borderColor: 'primary.main', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) },
              }}
            >
              <input type="file" hidden accept=".pdf" onChange={handleFileChange} />
              <UploadCloud size={48} style={{ marginBottom: 16, color: '#666' }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Click to select PDF</Typography>
              <Typography variant="body2" color="text.secondary">Maximum file size: 50MB</Typography>
            </Box>
          ) : (
            <Card variant="outlined" sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    p: 2, borderRadius: 2, 
                    bgcolor: (theme) => alpha(analyzing ? theme.palette.warning.main : theme.palette.success.main, 0.1), 
                    color: analyzing ? 'warning.main' : 'success.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {analyzing ? <CircularProgress size={24} color="inherit" /> : <FileText size={24} />}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {analyzing ? 'Analyzing File...' : activeFile?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {analyzing ? 'Verifying document structure...' : `${activeFile?.size} • ${activeFile?.pages} Pages detected`}
                    </Typography>
                  </Box>
                  {!uploading && !analyzing && (
                    <IconButton onClick={clearFile} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                      <X size={18} />
                    </IconButton>
                  )}
                </Box>
                {analyzing && <LinearProgress sx={{ mt: 3, borderRadius: 1, height: 6 }} />}
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Print Configuration</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    select fullWidth label="Copies" value={copies} 
                    disabled={uploading || analyzing}
                    onChange={(e) => setCopies(Number(e.target.value))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    {[1, 2, 3, 5, 10].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </TextField>
                  <TextField 
                    select fullWidth label="Print Mode" value={isColor ? 'color' : 'bw'} 
                    disabled={uploading || analyzing}
                    onChange={(e) => setIsColor(e.target.value === 'color')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    <MenuItem value="bw">B&W (৳{pricing.mono_price_per_page}/p)</MenuItem>
                    <MenuItem value="color">Color (৳{pricing.color_price_per_page}/p)</MenuItem>
                  </TextField>
                </Box>

                <Box sx={{ p: 3, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), border: '1px solid', borderColor: (theme) => alpha(theme.palette.primary.main, 0.1) }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Total Print Cost</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main' }}>৳{currentTotalCost.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1.5, opacity: 0.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Wallet Balance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>৳{balance.toFixed(2)}</Typography>
                  </Box>
                </Box>

                <Button 
                  fullWidth variant="contained" size="large" 
                  disabled={!activeFile || uploading || analyzing}
                  onClick={handleGeneratePrintJob}
                  sx={{ 
                    bgcolor: 'text.primary', color: 'background.default', 
                    py: 2, borderRadius: 2, fontWeight: 800,
                    '&:hover': { bgcolor: 'text.secondary' },
                    '&.Mui-disabled': { bgcolor: alpha('#000', 0.1) }
                  }}
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <Printer size={22} />}
                >
                  {uploading ? 'Processing...' : 'Generate Print Job'}
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', opacity: 0.6 }}>
                  <ShieldCheck size={14} /><Typography variant="caption" sx={{ fontWeight: 700 }}>SECURE ENCRYPTED UPLOAD</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}