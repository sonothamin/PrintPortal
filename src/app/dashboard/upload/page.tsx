'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Divider, 
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  MenuItem,
  Card,
  CardContent,
  alpha,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  UploadCloud, 
  FileText, 
  X, 
  Printer,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UploadPage() {
  const [files, setFiles] = useState<{ 
    file: File; 
    name: string; 
    size: string; 
    progress: number; 
    pages: number; 
    cost: number 
  }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [pricing, setPricing] = useState({
    mono_price_per_page: 2.00,
    color_price_per_page: 10.00
  });
  const [isColor, setIsColor] = useState(false);
  const [copies, setCopies] = useState(1);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState({ text: '', type: 'info' as 'info' | 'success' | 'error' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch pricing
    const { data: setRes } = await supabase.from('settings').select('value').eq('key', 'print_pricing').single();
    if (setRes) setPricing(setRes.value);

    // Fetch balance
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', session.user.id).single();
    if (profile) setBalance(profile.wallet_balance);
  };



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setAnalyzing(true);
      setStatus({ text: 'Analyzing documents...', type: 'info' });
      const selectedFiles = Array.from(e.target.files);
      let successCount = 0;
      
      for (const file of selectedFiles) {
        try {
          // 1. Upload to Temp/Verification Area
          const fileExt = file.name.split('.').pop();
          const tempPath = `temp/${session.user.id}/${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(tempPath, file);

          if (uploadError) throw uploadError;

          // 2. Call Edge Function for Official Verification
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-document', {
            body: { 
              file_path: tempPath, 
              is_color: isColor, 
              copies: copies 
            }
          });

          console.log('[DEBUG] verify-document raw response:', JSON.stringify(verifyData));

          if (verifyError) {
            // Check for common auth/deployment issues
            const errMsg = verifyError.message || '';
            if (errMsg.includes('401') || errMsg.includes('Unauthorized') || verifyData === null) {
              throw new Error('Verification server returned 401. Please ensure the Edge Function has JWT verification disabled in the Supabase Dashboard.');
            }
            throw new Error(errMsg || 'Verification failed');
          }
          
          if (!verifyData?.success) throw new Error(verifyData?.error || 'Verification failed');

          const pageCount = Number(verifyData.page_count) || 0;
          const verifiedCost = Number(verifyData.cost) || 0;

          console.log('[DEBUG] Parsed pageCount:', pageCount, 'cost:', verifiedCost);

          setFiles(prev => [...prev, {
            file,
            path: tempPath,
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            progress: 100,
            pages: pageCount,
            cost: verifiedCost
          } as any]);
          successCount++;
        } catch (err: any) {
          setStatus({ text: `Error processing ${file.name}: ${err.message}`, type: 'error' });
        }
      }
      if (successCount > 0) {
        setStatus({ text: `${successCount} document(s) verified and ready.`, type: 'success' });
      }
      setAnalyzing(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleGeneratePrintJob = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setStatus({ text: 'Finalizing queue...', type: 'info' });
    
    try {
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i] as any;
        
        // Call add-to-queue Edge Function
        const { data, error } = await supabase.functions.invoke('add-to-queue', {
          body: {
            file_path: fileItem.path,
            file_name: fileItem.name,
            is_color: isColor,
            copies: copies
          }
        });

        if (error || !data.success) throw new Error(error?.message || 'Failed to add to queue');
        
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 100 } : f));
      }

      setStatus({ text: 'Success! Your print jobs are ready.', type: 'success' });
      setFiles([]);
      fetchData(); // Refresh balance
    } catch (err: any) {
      let message = err.message || 'Error generating print jobs';
      if (message.includes('Edge Function returned')) {
        message = 'Server rejected the print job (possibly insufficient balance or invalid file).';
      }
      setStatus({ text: message, type: 'error' });
      // Remove files that successfully hit 100% progress so the user doesn't accidentally retry them
      setFiles(prev => prev.filter(f => f.progress !== 100));
    } finally {
      setUploading(false);
    }
  };
  const calculateFileCost = (pages: number) => pages * (isColor ? pricing.color_price_per_page : pricing.mono_price_per_page) * copies;
  const totalCost = files.reduce((acc, curr) => acc + calculateFileCost(curr.pages), 0);

  return (
    <DashboardLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Upload Documents
        </Typography>
        <Typography color="text.secondary">
          Upload your PDFs to the secure cloud for instant PrintPortal printing.
        </Typography>
      </Box>

      {status.text && (
        <Alert severity={status.type} sx={{ mb: 4, borderRadius: 3 }}>{status.text}</Alert>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box 
            component="label"
            sx={{ 
              display: 'block',
              p: 6, 
              border: '2px dashed', 
              borderColor: 'divider', 
              borderRadius: 4, 
              textAlign: 'center',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'grey.50',
              cursor: 'pointer',
              '&:hover': { 
                borderColor: 'primary.main', 
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) 
              },
              transition: 'all 0.2s ease',
              pointerEvents: uploading ? 'none' : 'auto',
              opacity: uploading ? 0.6 : 1
            }}
          >
            <input type="file" hidden multiple accept=".pdf" onChange={handleFileChange} disabled={uploading || analyzing} />
            <Box sx={{ mb: 2, color: 'text.secondary', display: 'flex', justifyContent: 'center' }}>
              {analyzing ? <CircularProgress size={48} color="inherit" /> : <UploadCloud size={48} />}
            </Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 800, mb: 1 }}>
              {analyzing ? 'Verifying PDF structure...' : 'Click to upload or drag and drop'}
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              PDF documents only (Max 50MB)
            </Typography>
          </Box>

          {files.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Queue ({files.length} files)
              </Typography>
              <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {files.map((file, idx) => (
                  <ListItem 
                    key={idx} 
                    sx={{ 
                      bgcolor: 'background.paper', 
                      borderRadius: 3, 
                      border: '1px solid', 
                      borderColor: 'divider',
                      p: 2
                    }}
                    secondaryAction={
                      !uploading && (
                        <IconButton edge="end" onClick={() => removeFile(idx)}>
                          <X size={18} />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemIcon>
                      <Box sx={{ bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05), p: 1, borderRadius: 2 }}>
                        <FileText size={20} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText 
                      primary={file.name} 
                      primaryTypographyProps={{ fontWeight: 700 }}
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', gap: 2, mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">{file.size}</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>{file.pages} Pages</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>৳{calculateFileCost(file.pages).toFixed(2)}</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={file.progress} 
                            sx={{ mt: 0.5, borderRadius: 1, height: 6 }} 
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, position: 'sticky', top: 24 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                Print Configuration
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    select 
                    fullWidth 
                    label="Copies" 
                    value={copies} 
                    onChange={(e) => setCopies(Number(e.target.value))}
                    sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  >
                    {[1, 2, 3, 4, 5, 10].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </TextField>
                  <TextField 
                    select 
                    fullWidth 
                    label="Print Mode" 
                    value={isColor ? 'color' : 'bw'} 
                    onChange={(e) => setIsColor(e.target.value === 'color')}
                    sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  >
                    <MenuItem value="bw">B&W (৳{pricing.mono_price_per_page}/p)</MenuItem>
                    <MenuItem value="color">Color (৳{pricing.color_price_per_page}/p)</MenuItem>
                  </TextField>
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Box sx={{ 
                  p: 3, 
                  borderRadius: 4, 
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.1)
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Documents ({files.length})</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{files.reduce((a, c) => a + c.pages, 0) * copies} Pages</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Total Print Cost</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main' }}>৳{totalCost.toFixed(2)}</Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2, borderColor: (theme) => alpha(theme.palette.primary.main, 0.1) }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Wallet Balance</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>৳{balance.toFixed(2)}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Remaining Balance</Typography>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 900, 
                      color: balance >= totalCost ? 'success.main' : 'error.main' 
                    }}>
                      ৳{(balance - totalCost).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>

                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large" 
                  disabled={files.length === 0 || uploading}
                  onClick={handleGeneratePrintJob}
                  sx={{ 
                    bgcolor: 'text.primary', 
                    color: 'background.default',
                    py: 2.5, 
                    borderRadius: 3, 
                    fontWeight: 800,
                    '&:hover': { 
                      bgcolor: 'text.secondary',
                      boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.1)'
                    } 
                  }}
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <Printer size={22} />}
                >
                  {uploading ? 'Processing...' : 'Generate Print Job'}
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', opacity: 0.6 }}>
                  <ShieldCheck size={14} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>SECURE ENCRYPTED UPLOAD</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}

