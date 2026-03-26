'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button,
  Container,
  CircularProgress,
  Dialog,
  DialogContent,
  Alert
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Printer, 
  QrCode, 
  ChevronLeft, 
  CheckCircle2, 
  Hash,
  AlertCircle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function KioskPage() {
  const router = useRouter();
  const [loadingContext, setLoadingContext] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [mode, setMode] = useState<'home' | 'print' | 'copy' | 'scanning'>('home');
  const [releaseCode, setReleaseCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .single();

      if (profile?.status === 'suspended') {
        router.push('/suspended');
        return;
      }

      if (profile?.role !== 'admin' && profile?.role !== 'kiosk') {
        setForbidden(true);
        setTimeout(() => router.push('/dashboard'), 3000);
      } else {
        setLoadingContext(false);
      }
    };
    checkAccess();
  }, [router]);

  React.useEffect(() => {
    let html5QrCode: any = null;
    let isScanning = false;
    
    const startScanner = async () => {
      if (mode === 'scanning') {
        try {
          html5QrCode = new Html5Qrcode("reader");
          await html5QrCode.start(
            { facingMode: "environment" }, // Prefer back camera if available
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            async (decodedText: string) => {
              if (isScanning) return; // Prevent multiple triggers
              isScanning = true;
              
              if (html5QrCode) {
                html5QrCode.pause();
              }
              const success = await executePrint(decodedText);
              if (!success) {
                // If it failed, let the user read the error for 3s then resume scanning
                setTimeout(() => {
                  setErrorMsg('');
                  if (html5QrCode) html5QrCode.resume();
                  isScanning = false;
                }, 3000);
              } else {
                if (html5QrCode) {
                  await html5QrCode.stop();
                  html5QrCode.clear();
                }
              }
            },
            () => {
              // Ignore standard frame-by-frame scan failures
            }
          );
        } catch {
      console.error('Kiosk auth error');
          setErrorMsg("Camera access denied or unavailable.");
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode?.clear()).catch(console.error);
      }
    };
  }, [mode]);

  const handleNumpad = (val: string) => {
    if (releaseCode.length < 6) setReleaseCode(prev => prev + val);
    setErrorMsg('');
  };

  const executePrint = async (code: string) => {
    if (!code || code.length !== 6) {
      setErrorMsg('Invalid code format. Must be 6 characters.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('release-job', {
        body: { release_code: code }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to release job');
      }

      // Trigger actual browser print sequence via hidden iframe
      if (data?.file_url) {
        try {
          // Fetch the PDF as a Blob to circumvent cross-origin frame isolation policies
          const response = await fetch(data.file_url);
          if (!response.ok) throw new Error('Failed to download PDF for printing');
          const blob = await response.blob();
          const localUrl = URL.createObjectURL(blob);

          const printIframe = document.createElement('iframe');
          printIframe.id = 'hidden-print-iframe';
          printIframe.style.display = 'none';
          printIframe.src = localUrl;
          document.body.appendChild(printIframe);

          printIframe.onload = () => {
            try {
              printIframe.contentWindow?.print();
            } catch (e) {
              console.error('Print execution failed:', e);
            }
            // Cleanup local URL and iframe after 60s
            setTimeout(() => {
              if (document.body.contains(printIframe)) {
                 document.body.removeChild(printIframe);
              }
              URL.revokeObjectURL(localUrl);
            }, 60000);
          };
        } catch (downloadErr) {
          console.error("Blob printing failed:", downloadErr);
          // Fallback to opening the PDF directly if fetch is blocked
          window.open(data.file_url, '_blank');
        }
      }

      setProcessing(false);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setMode('home');
        setReleaseCode('');
      }, 10000);
      return true;
    } catch (err: any) {
      setProcessing(false);
      setErrorMsg(err.message);
      return false;
    }
  };

  const handlePrint = () => executePrint(releaseCode);

  if (loadingContext) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (forbidden) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default', gap: 2 }}>
        <AlertCircle size={64} color="#f44336" />
        <Typography variant="h3" color="error" fontWeight={900}>403 FORBIDDEN</Typography>
        <Typography variant="h6" color="text.secondary">This interface is restricted to Kiosk terminals only.</Typography>
        <Typography variant="body2" sx={{ opacity: 0.5 }}>Redirecting back to dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default', 
        color: 'text.primary', 
        display: 'flex', 
        flexDirection: 'column',
        p: 4
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Printer size={48} strokeWidth={2.5} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
              PrintPortal
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.6, fontWeight: 700 }}>
              Public Kiosk
            </Typography>
          </Box>
        </Box>
        {mode !== 'home' && (
          <Button 
            variant="outlined" 
            color="inherit" 
            size="large"
            onClick={() => setMode('home')}
            startIcon={<ChevronLeft size={24} />}
            sx={{ borderRadius: 4, px: 4, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            Back
          </Button>
        )}
      </Box>

      <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
        {mode === 'home' && (
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper 
                onClick={() => setMode('print')}
                sx={{ 
                  bgcolor: 'background.paper', 
                  color: 'text.primary', 
                  p: 6, 
                  borderRadius: 8, 
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  '&:hover': { borderColor: 'text.primary' },
                  transition: 'all 0.2s'
                }}
              >
                <Hash size={80} strokeWidth={1} style={{ marginBottom: 24, opacity: 0.8 }} />
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>Enter Code</Typography>
                <Typography variant="h6" sx={{ opacity: 0.6 }}>Release your print job using the 6-digit code.</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper 
                onClick={() => setMode('scanning')}
                sx={{ 
                  bgcolor: 'text.primary', 
                  color: 'background.default', 
                  p: 6, 
                  borderRadius: 8, 
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: '#eee' }
                }}
              >
                <QrCode size={80} strokeWidth={1} style={{ marginBottom: 24 }} />
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>Scan QR</Typography>
                <Typography variant="h6" sx={{ opacity: 0.6 }}>Quick release by scanning your portal QR code.</Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {mode === 'print' && (
          <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h3" sx={{ textAlign: 'center', fontWeight: 900, mb: 4 }}>
              ENTER RELEASE CODE
            </Typography>

            {errorMsg && (
              <Alert 
                severity="error" 
                sx={{ mb: 4, borderRadius: 3, fontWeight: 700, fontSize: '1.1rem', justifyContent: 'center' }}
              >
                {errorMsg}
              </Alert>
            )}
            
            <Box
              component="input"
              value={releaseCode}
              onChange={(e: any) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                setReleaseCode(val.slice(0, 6));
                setErrorMsg('');
              }}
              onClick={(e: any) => e.target.focus()}
              sx={{
                bgcolor: '#1a1a1a',
                p: 3,
                borderRadius: 4,
                mb: 4,
                textAlign: 'center',
                letterSpacing: 8,
                fontSize: '3rem',
                fontWeight: 900,
                minHeight: 100,
                width: '100%',
                border: '2px solid #333',
                color: '#fff',
                outline: 'none',
                fontFamily: 'inherit',
                '&:focus': { borderColor: 'primary.main' }
              }}
              placeholder="______"
            />

            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 1 }}>
              {[
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
                ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
              ].map((row, rowIdx) => (
                <Box key={rowIdx} sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                  {row.map((key) => (
                    <Button
                      key={key}
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        if (key === 'DEL') setReleaseCode(prev => prev.slice(0, -1));
                        else handleNumpad(key);
                      }}
                      sx={{
                        minWidth: key === 'DEL' ? 80 : 50,
                        height: 60,
                        borderRadius: 2,
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        borderColor: '#333',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'text.primary' }
                      }}
                    >
                      {key}
                    </Button>
                  ))}
                </Box>
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              disabled={releaseCode.length !== 6 || processing}
              onClick={handlePrint}
              startIcon={processing ? <CircularProgress size={30} color="inherit" /> : null}
              sx={{
                mt: 4,
                height: 80,
                borderRadius: 4,
                fontSize: '2rem',
                fontWeight: 900,
                bgcolor: '#fff',
                color: '#000',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                '&.Mui-disabled': { bgcolor: '#333', color: '#666' }
              }}
            >
              {processing ? 'PREPARING...' : 'PRINT JOB'}
            </Button>
          </Box>
        )}

        {mode === 'scanning' && (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            {errorMsg && (
              <Alert 
                severity="error" 
                sx={{ mb: 4, borderRadius: 3, fontWeight: 700, fontSize: '1.1rem', justifyContent: 'center', maxWidth: 400, mx: 'auto' }}
              >
                {errorMsg}
              </Alert>
            )}
            <Box 
              sx={{ 
                width: 300, 
                height: 300, 
                border: '4px solid #fff', 
                borderRadius: 6, 
                mx: 'auto', 
                mb: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box id="reader" sx={{ width: '100%', height: '100%', '& video': { objectFit: 'cover !important', width: '100% !important', height: '100% !important' } }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>Scanning...</Typography>
            <Typography variant="h6" sx={{ opacity: 0.6 }}>Please hold your QR code in front of the camera.</Typography>
          </Box>
        )}
      </Container>

      {/* Footer / Status */}
      <Box sx={{ mt: 'auto', textAlign: 'center', opacity: 0.4 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          © 2026 PrintPortal - Sonoth Amin
        </Typography>
      </Box>

      {/* Processing Dialog */}
      <Dialog 
        open={processing || done} 
        fullScreen={false} 
        PaperProps={{ 
          sx: { 
            bgcolor: '#1a1a1a', 
            color: '#fff', 
            borderRadius: 8, 
            p: 6, 
            textAlign: 'center',
            minWidth: 400
          } 
        }}
      >
        <DialogContent>
          {processing ? (
            <>
              <CircularProgress size={80} color="inherit" sx={{ mb: 4 }} />
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>PRINTING...</Typography>
              <Typography sx={{ opacity: 0.6 }}>Please wait while your document is being processed.</Typography>
            </>
          ) : (
            <>
              <CheckCircle2 size={80} color="#4caf50" style={{ marginBottom: 32, margin: '0 auto' }} />
              <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>SUCCESS!</Typography>
              <Typography variant="h6" sx={{ opacity: 0.6, mb: 4 }}>Please collect your prints from the tray.</Typography>
              <Typography variant="caption" sx={{ bgcolor: '#333', px: 2, py: 1, borderRadius: 2 }}>
                AUTO-CLOSING IN 5 SECONDS
              </Typography>
            </>
          )}
        </DialogContent>
      </Dialog>

    </Box>
  );
}
