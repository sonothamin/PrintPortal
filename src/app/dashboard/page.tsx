'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { formatTimeAgo } from '@/utils/date';
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
  Skeleton,
  Tooltip
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
  XCircle,
  Copy,
  FileText
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
        supabase.from('print_jobs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const pendingJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
  const pastJobs = jobs.filter(j => j.status === 'completed' || j.status === 'canceled').slice(0, 5);

  return (
    <DashboardLayout>
      {/* Header & Balance Section */}
      <Box sx={{ mb: 6, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: -1.5 }}>
            {loading ? <Skeleton width={200} /> : `${getGreeting()}, ${profile?.full_name?.split(' ')[0] || 'User'}!`}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
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

      {/* Jobs in Queue Section */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock size={20} /> Jobs in Queue
        </Typography>
        <Grid container spacing={2}>
          {loading ? [...Array(2)].map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          )) : pendingJobs.length > 0 ? pendingJobs.map((job) => (
            <Grid key={job.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ borderRadius: 2, position: 'relative', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: '70%' }}>
                      <FileText size={16} className="text-primary" />
                      <Typography variant="body2" noWrap sx={{ fontWeight: 800 }}>{job.file_name}</Typography>
                    </Box>
                    <Chip label={job.status.toUpperCase()} size="small" color={job.status === 'pending' ? 'warning' : 'info'} sx={{ fontSize: '0.6rem', fontWeight: 900, height: 20 }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Uploaded {formatTimeAgo(job.created_at)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      fullWidth 
                      size="small" 
                      variant="contained" 
                      startIcon={<QrCode size={14} />} 
                      onClick={() => setQrJob(job)}
                      sx={{ fontWeight: 800, borderRadius: 1.5 }}
                    >
                      QR Code
                    </Button>
                    <Tooltip title="Copy Release Code">
                      <IconButton size="small" onClick={() => handleCopy(job.release_code)} sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), borderRadius: 1.5 }}>
                        <Copy size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )) : (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ py: 4, textAlign: 'center', bgcolor: (theme) => alpha(theme.palette.divider, 0.05), borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>No active jobs in the queue.</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      <Grid container spacing={4}>
        {/* Recent Activity Table */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, border: 'none', boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? [...Array(3)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={3}><Skeleton height={45} /></TableCell></TableRow>
                    )) : pastJobs.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{job.file_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{formatTimeAgo(job.created_at)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={job.status.toUpperCase()} 
                            size="small" 
                            color={job.status === 'completed' ? 'success' : 'error'} 
                            sx={{ fontWeight: 900, fontSize: '0.6rem', borderRadius: 1 }} 
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>৳{job.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar Actions & Kiosks */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              borderRadius: 2,
              background: (theme) => theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${alpha(theme.palette.primary.main, 0.2)} 100%)`
                : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
              color: (theme) => theme.palette.getContrastText(theme.palette.primary.main),
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: (theme) => `0 20px 25px -5px ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.15, transform: 'rotate(15deg)', color: 'inherit' }}>
              <Printer size={160} />
            </Box>
            <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 1, borderRadius: 2 }}>
                  <UploadCloud size={24} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Ready to print?</Typography>
              </Box>
              <Typography sx={{ mb: 4, opacity: 0.9, fontSize: '0.9rem', fontWeight: 500 }}>
                Upload documents and release them at any PrintPortal kiosk instantly.
              </Typography>
              <Button 
                variant="contained" 
                fullWidth 
                size="large"
                sx={{ 
                  bgcolor: 'background.paper', 
                  color: 'primary.main', 
                  fontWeight: 900, 
                  borderRadius: 2.5,
                  py: 1.5,
                  '&:hover': { bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9), transform: 'scale(1.02)' },
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

      {/* QR Code Dialog */}
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
          <Box sx={{ width: '100%' }}>
            <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main', letterSpacing: 3, mb: 1 }}>
              {qrJob?.release_code}
            </Typography>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<Copy size={14} />} 
              onClick={() => handleCopy(qrJob?.release_code || '')}
              sx={{ mb: 2, borderRadius: 1.5, fontWeight: 700 }}
            >
              Copy Code
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Scan this QR code at any PrintPortal kiosk to release your print job.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}