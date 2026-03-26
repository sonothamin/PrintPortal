'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import {
  Grid,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  alpha,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle
} from '@mui/material';
import {
  UploadCloud,
  ExternalLink,
  Wallet,
  Zap,
  Printer,
  QrCode,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PrintJob {
  id: string;
  file_name: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'canceled';
  release_code: string;
  cost: number;
}

interface UserProfile {
  full_name: string;
  wallet_balance: number;
}

interface Kiosk {
  name: string;
  status: 'online' | 'offline' | 'error';
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrJob, setQrJob] = useState<PrintJob | null>(null);

  const fetchData = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [jobsRes, profileRes, kiosksRes] = await Promise.all([
      supabase
        .from('print_jobs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('kiosks')
        .select('name, status')
        .limit(5)
    ]);

    if (jobsRes.data) setJobs(jobsRes.data);
    if (profileRes.data) setProfile(profileRes.data);
    if (kiosksRes.data) setKiosks(kiosksRes.data as Kiosk[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) return (
    <DashboardLayout>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Typography color="text.secondary">Loading your dashboard...</Typography>
      </Box>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Box sx={{ mb: 6, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: -1.5 }}>
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'My Good Sire!'}!
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500 }}>
            {(profile?.wallet_balance ?? 0) < 5
              ? "Your balance is low. Top up to keep printing!"
              : "Ready to turn those digital files into paper?"}
          </Typography>
        </Box>
        <Card variant="outlined" sx={{ borderRadius: 2, px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, bgcolor: (theme) => alpha(theme.palette.success.main, 0.05), borderColor: 'success.main', borderStyle: 'dashed' }}>
          <Box sx={{ bgcolor: 'success.main', p: 0.8, borderRadius: 1.5, color: 'white', display: 'flex' }}>
            <Wallet size={18} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main', display: 'block', lineHeight: 1 }}>BALANCE</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>৳{profile?.wallet_balance?.toFixed(2) || '0.00'}</Typography>
          </Box>
        </Card>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 4, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Recent Print Jobs
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  endIcon={<ExternalLink size={16} />}
                  sx={{ fontWeight: 800 }}
                  onClick={() => window.location.href = '/dashboard/history'}
                >
                  Detailed History
                </Button>
              </Box>

              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>DOCUMENT</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>DATE</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>CODE</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>COST</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs.length > 0 ? jobs.map((job) => (
                      <TableRow key={job.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 700 }}>{job.file_name}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={job.status}
                            color={job.status === 'completed' ? 'success' : 'warning'}
                            variant="filled"
                            sx={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.65rem', borderRadius: 1.5 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), px: 1, py: 0.5, borderRadius: 1, display: 'inline-block' }}>
                              {job.release_code || '---'}
                            </Typography>
                            {job.release_code && (
                              <IconButton
                                size="small"
                                onClick={() => setQrJob(job)}
                                sx={{
                                  color: 'primary.main',
                                  '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1) }
                                }}
                              >
                                <QrCode size={16} />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900 }}>৳{job.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <Typography color="text.secondary" variant="body2">No recent print activity detected.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              borderRadius: 2,
              // Uses theme palette instead of hardcoded hex
              background: (theme) => theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${theme.palette.common.black} 0%, ${alpha(theme.palette.common.white, 0.05)} 100%)`
                : `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.8)} 100%)`,
              color: (theme) => theme.palette.getContrastText(theme.palette.text.primary),
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                : '0 20px 25px -5px rgb(0 0 0 / 0.1)'
            }}
          >
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1, transform: 'rotate(15deg)', color: 'inherit' }}>
              <Printer size={160} />
            </Box>
            <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 1, borderRadius: 2 }}>
                  <UploadCloud size={24} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Ready to print?
                </Typography>
              </Box>
              <Typography sx={{ mb: 4, opacity: 0.8, fontSize: '0.9rem', lineHeight: 1.6 }}>
                Upload your files now and pick them up at any available kiosk location instantly.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  fontWeight: 900,
                  borderRadius: 2.5,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: 'background.default',
                    transform: 'scale(1.02)'
                  },
                  transition: 'all 0.2s'
                }}
                onClick={() => window.location.href = '/dashboard/upload'}
              >
                Upload Document
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), color: 'primary.main', p: 1, borderRadius: 2, display: 'flex' }}>
                  <Zap size={20} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                  Live Kiosk Map
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {kiosks.length > 0 ? kiosks.map((kiosk, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: kiosk.status === 'online' ? 'success.main' : 'error.main', boxShadow: (theme) => `0 0 8px ${kiosk.status === 'online' ? theme.palette.success.main : theme.palette.error.main}` }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{kiosk.name}</Typography>
                    </Box>
                    <Chip
                      label={kiosk.status}
                      size="small"
                      color={kiosk.status === 'online' ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontWeight: 900, fontSize: '0.6rem', height: 20, textTransform: 'uppercase' }}
                    />
                  </Box>
                )) : (
                  <Typography variant="caption" color="text.secondary">No kiosks registered in the system.</Typography>
                )}
              </Box>
              <Button fullWidth sx={{ mt: 3, fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>View Service Map</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR Code Dialog */}
      <Dialog
        open={!!qrJob}
        onClose={() => setQrJob(null)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1,
            maxWidth: 360,
            textAlign: 'center'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Release Code QR
          <IconButton size="small" onClick={() => setQrJob(null)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pb: 4 }}>
          {qrJob?.release_code && (
            <Box sx={{
              bgcolor: 'white',
              p: 3,
              borderRadius: 3,
              border: '2px solid',
              borderColor: 'divider',
              display: 'inline-flex'
            }}>
              <QRCodeSVG
                value={qrJob.release_code}
                size={200}
                level="H"
                includeMargin={false}
              />
            </Box>
          )}
          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main', letterSpacing: 3 }}>
              {qrJob?.release_code}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Scan this QR code at any PrintPortal kiosk to release your print job.
            </Typography>
          </Box>
          <Box sx={{
            bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
            borderRadius: 2,
            p: 2,
            width: '100%'
          }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>
              {qrJob?.file_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Cost: ৳{qrJob?.cost.toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
