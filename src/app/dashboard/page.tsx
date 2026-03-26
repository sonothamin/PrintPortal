'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  alpha, 
  IconButton, 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  Stack, 
  Skeleton
} from '@mui/material';
import {
  ExternalLink, 
  Wallet, 
  Zap, 
  Printer, 
  QrCode, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Undo2
} from 'lucide-react';

import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

// --- Types ---
const STATUS_CONFIG = {
  processing: { label: 'Processing', color: '#5a82e8', icon: <Zap size={14} fill="#5a82e8" /> },
  pending: { label: 'Pending', color: '#ed6c02', icon: <Clock size={14} /> },
  canceled: { label: 'Canceled', color: '#d32f2f', icon: <XCircle size={14} /> },
  refunded: { label: 'Refunded', color: '#9c27b0', icon: <Undo2 size={14} /> },
  completed: { label: 'Completed', color: '#2e7d32', icon: <CheckCircle2 size={14} /> },
} as const;

type PrintStatus = keyof typeof STATUS_CONFIG;

interface PrintJob {
  id: string;
  file_name: string;
  status: PrintStatus;
  release_code: string | null;
  cost: number;
}

interface Profile {
  full_name: string;
  wallet_balance: number;
}

interface Kiosk {
  name: string;
  status: 'online' | 'offline';
}

interface DashboardData {
  jobs: PrintJob[];
  profile: Profile | null;
  kiosks: Kiosk[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({ jobs: [], profile: null, kiosks: [] });
  const [loading, setLoading] = useState(true);
  const [qrJob, setQrJob] = useState<PrintJob | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [jobsRes, profileRes, kiosksRes] = await Promise.all([
        supabase.from('print_jobs').select('id, file_name, status, release_code, cost').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('full_name, wallet_balance').eq('id', session.user.id).single(),
        supabase.from('kiosks').select('name, status').limit(4)
      ]);

      setData({
        jobs: (jobsRes.data as PrintJob[]) || [],
        profile: profileRes.data as Profile,
        kiosks: (kiosksRes.data as Kiosk[]) || []
      });
    } catch (e) {
      console.error('Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const StatusBadge = ({ status }: { status: PrintStatus }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3,
        borderRadius: 1.5, fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
        color: config.color, bgcolor: alpha(config.color, 0.1), border: `1px solid ${alpha(config.color, 0.2)}`
      }}>
        {config.icon} {config.label}
      </Box>
    );
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>
            {loading ? <Skeleton width={150} /> : `Hey, ${data.profile?.full_name?.split(' ')[0] || 'User'}!`}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? <Skeleton width={200} /> : "Your printing station is ready."}
          </Typography>
        </Box>

        <Card sx={{ 
          borderRadius: 3, bgcolor: 'text.primary', color: 'background.paper', 
          position: 'relative', overflow: 'hidden', minWidth: 200 
        }}>
          <CardContent sx={{ p: 2, zIndex: 1, position: 'relative' }}>
            <Typography variant="overline" sx={{ opacity: 0.5, fontWeight: 900, lineHeight: 1 }}>Wallet Balance</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
              ৳{loading ? '0.00' : data.profile?.wallet_balance?.toFixed(2)}
            </Typography>
          </CardContent>
          <Wallet size={60} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.1, transform: 'rotate(-15deg)' }} />
        </Card>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Recent Activity</Typography>
                <Button size="small" endIcon={<ExternalLink size={14} />} href="/dashboard/history">History</Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>FILE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>CODE</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>COST</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? [...Array(3)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={4}><Skeleton height={40} /></TableCell></TableRow>
                    )) : data.jobs.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{job.file_name}</TableCell>
                        <TableCell><StatusBadge status={job.status} /></TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'primary.main', bgcolor: alpha('#1976d2', 0.05), px: 1, borderRadius: 1 }}>
                              {job.release_code || '---'}
                            </Typography>
                            {job.release_code && (
                              <IconButton size="small" onClick={() => setQrJob(job)} color="primary"><QrCode size={16} /></IconButton>
                            )}
                          </Stack>
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

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            <Card sx={{
              borderRadius: 3, bgcolor: 'text.primary', color: 'background.paper',
              position: 'relative', overflow: 'hidden'
            }}>
              <CardContent sx={{ p: 4, zIndex: 1, position: 'relative' }}>
                <Typography variant="overline" sx={{ opacity: 0.5, fontWeight: 900, letterSpacing: 1.5 }}>
                  Quick Actions
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, mt: 1, mb: 0.5, letterSpacing: -1 }}>
                  Ready to print?
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
                  Upload and release at any kiosk.
                </Typography>
                <Button 
                  variant="contained" 
                  fullWidth 
                  href="/dashboard/upload" 
                  sx={{ 
                    bgcolor: 'background.paper', color: 'text.primary', 
                    fontWeight: 800, textTransform: 'none',
                    '&:hover': { bgcolor: '#eee' } 
                  }}
                >
                  Upload Now
                </Button>
              </CardContent>
              <Printer size={140} style={{ position: 'absolute', right: -30, bottom: -30, opacity: 0.05, transform: 'rotate(-15deg)' }} />
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Nearby Kiosks</Typography>
                <Stack spacing={2}>
                  {data.kiosks.map((k, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.name}</Typography>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: k.status === 'online' ? 'success.main' : 'error.main' }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={!!qrJob} onClose={() => setQrJob(null)} PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between' }}>
          Scan to Print <IconButton onClick={() => setQrJob(null)}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {qrJob?.release_code && <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', borderRadius: 2, mb: 2, border: '1px solid #eee' }}>
            <QRCodeSVG value={qrJob.release_code} size={180} />
          </Box>}
          <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main', letterSpacing: 3 }}>
            {qrJob?.release_code}
          </Typography>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}