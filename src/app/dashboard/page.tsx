'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  DialogTitle,
  Stack,
  Skeleton
} from '@mui/material';
import {
  UploadCloud,
  ExternalLink,
  Wallet,
  Zap,
  Printer,
  QrCode,
  X,
  Clock,
  CheckCircle2,
  XCircle
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

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [jobsRes, profileRes, kiosksRes] = await Promise.all([
        supabase.from('print_jobs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('kiosks').select('name, status').limit(5)
      ]);

      if (jobsRes.data) setJobs(jobsRes.data as PrintJob[]);
      if (profileRes.data) setProfile(profileRes.data as UserProfile);
      if (kiosksRes.data) setKiosks(kiosksRes.data as Kiosk[]);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
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

  const StatusBadge = ({ status }: { status: PrintJob['status'] }) => {
    const configs = {
      pending: { color: 'warning', icon: <Clock size={12} /> },
      processing: { color: 'info', icon: <Zap size={12} /> },
      completed: { color: 'success', icon: <CheckCircle2 size={12} /> },
      canceled: { color: 'error', icon: <XCircle size={12} /> }
    };
    const config = configs[status] || configs.pending;
    return (
      <Chip 
        label={status.toUpperCase()} 
        size="small" 
        icon={config.icon}
        color={config.color as any}
        sx={{ fontWeight: 900, fontSize: '0.65rem', borderRadius: 1 }} 
      />
    );
  };

  return (
    <DashboardLayout>
      <Box sx={{ mb: 6, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: -1.5 }}>
            {loading ? <Skeleton width={200} /> : `${getGreeting()}, ${profile?.full_name?.split(' ')[0] || 'User'}!`}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500 }}>
            {loading ? <Skeleton width={250} /> : (profile?.wallet_balance ?? 0) < 5
              ? "Your balance is low. Top up to keep printing!"
              : "Ready to turn those digital files into paper?"}
          </Typography>
        </Box>
        
        <Card variant="outlined" sx={{ borderRadius: 2, px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, bgcolor: (theme) => alpha(theme.palette.success.main, 0.05), borderColor: 'success.main', borderStyle: 'dashed' }}>
          <Box sx={{ bgcolor: 'success.main', p: 0.8, borderRadius: 1.5, color: 'white', display: 'flex' }}>
            <Wallet size={18} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main', display: 'block', lineHeight: 1, mb: 0.5 }}>BALANCE</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>
              ৳{loading ? '0.00' : profile?.wallet_balance?.toFixed(2)}
            </Typography>
          </Box>
        </Card>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 4, border: 'none', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Recent Activity</Typography>
                <Button size="small" endIcon={<ExternalLink size={14} />} href="/dashboard/history" sx={{ fontWeight: 700 }}>View All</Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>DOCUMENT</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>STATUS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>COST</TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? [...Array(3)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={4}><Skeleton height={45} /></TableCell></TableRow>
                    )) : jobs.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{job.file_name}</TableCell>
                        <TableCell><StatusBadge status={job.status} /></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>৳{job.cost.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          {job.release_code && (
                            <IconButton size="small" onClick={() => setQrJob(job)} color="primary"><QrCode size={18} /></IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Ready to print?</Typography>
              </Box>
              <Typography sx={{ mb: 4, opacity: 0.8, fontSize: '0.9rem', fontWeight: 500 }}>
                Upload your documents now and release them at any PrintPortal kiosk instantly.
              </Typography>
              <Button 
                variant="contained" 
                fullWidth 
                size="large"
                sx={{ 
                  bgcolor: 'background.paper', 
                  color: 'text.primary', 
                  fontWeight: 900, 
                  borderRadius: 2.5,
                  py: 1.5,
                  '&:hover': { bgcolor: 'background.default', transform: 'scale(1.02)' },
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
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Nearby Kiosks</Typography>
              </Box>
              <Stack spacing={2}>
                {loading ? [...Array(3)].map((_, i) => <Skeleton key={i} height={30} />) : kiosks.map((kiosk, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{kiosk.name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: kiosk.status === 'online' ? 'success.main' : 'error.main' }} />
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>{kiosk.status}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog 
        open={!!qrJob} 
        onClose={() => setQrJob(null)}
        PaperProps={{ sx: { borderRadius: 2, p: 1, maxWidth: 360, textAlign: 'center' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Release Code QR
          <IconButton size="small" onClick={() => setQrJob(null)}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pb: 4 }}>
          {qrJob?.release_code && (
            <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 3, border: '2px solid', borderColor: 'divider', display: 'inline-flex' }}>
              <QRCodeSVG value={qrJob.release_code} size={200} level="H" />
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
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}