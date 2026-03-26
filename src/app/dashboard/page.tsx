'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import {
  Grid, Typography, Card, CardContent, Box, Button, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  alpha, IconButton, Dialog, DialogContent, DialogTitle, 
  Stack, LinearProgress, Tooltip
} from '@mui/material';
import {
  UploadCloud, ExternalLink, Wallet, Zap, Printer, 
  QrCode, X, Clock, CheckCircle2, XCircle, Undo2, Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// --- Configuration ---
const STATUS_CONFIG = {
  processing: { label: 'Processing', color: '#5a82e8', icon: <Zap size={14} /> },
  pending: { label: 'Pending', color: '#ed6c02', icon: <Clock size={14} /> },
  canceled: { label: 'Canceled', color: '#d32f2f', icon: <XCircle size={14} /> },
  refunded: { label: 'Refunded', color: '#9c27b0', icon: <Undo2 size={14} /> },
  completed: { label: 'Completed', color: '#2e7d32', icon: <CheckCircle2 size={14} /> },
};

interface PrintJob {
  id: string;
  file_name: string;
  created_at: string;
  status: keyof typeof STATUS_CONFIG;
  release_code: string;
  cost: number;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrJob, setQrJob] = useState<PrintJob | null>(null);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [jobsRes, profileRes, kiosksRes] = await Promise.all([
      supabase.from('print_jobs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('kiosks').select('name, status').limit(4)
    ]);

    if (jobsRes.data) setJobs(jobsRes.data as PrintJob[]);
    if (profileRes.data) setProfile(profileRes.data);
    if (kiosksRes.data) setKiosks(kiosksRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const StatusBadge = ({ status }: { status: keyof typeof STATUS_CONFIG }) => {
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

  if (loading) return (
    <DashboardLayout>
      <Box sx={{ width: '100%', mt: 4 }}><LinearProgress /></Box>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>
            Hey, {profile?.full_name?.split(' ')[0] || 'User'}!
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {(profile?.wallet_balance ?? 0) < 5 ? "Low balance alert! Top up soon." : "Your printing station is ready."}
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ 
          borderRadius: 3, px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, 
          bgcolor: 'success.main', color: 'white', border: 'none', boxShadow: (theme) => `0 10px 20px ${alpha(theme.palette.success.main, 0.2)}`
        }}>
          <Wallet size={20} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8, display: 'block', lineHeight: 1 }}>BALANCE</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>৳{profile?.wallet_balance?.toFixed(2)}</Typography>
          </Box>
        </Card>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Recent Activity */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Recent Activity</Typography>
                <Button size="small" endIcon={<ExternalLink size={14} />} onClick={() => window.location.href = '/dashboard/history'}>Full History</Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>FILE</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>CODE</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>COST</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell sx={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.file_name}
                        </TableCell>
                        <TableCell><StatusBadge status={job.status} /></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'primary.main', bgcolor: alpha('#1976d2', 0.05), px: 1, borderRadius: 1 }}>
                              {job.release_code || '---'}
                            </Typography>
                            {job.release_code && (
                              <IconButton size="small" onClick={() => setQrJob(job)} sx={{ color: 'primary.main' }}>
                                <QrCode size={16} />
                              </IconButton>
                            )}
                          </Box>
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

        {/* Right: Actions & Map */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            {/* Quick Upload Action */}
            <Card sx={{ 
              borderRadius: 3, bgcolor: 'text.primary', color: 'background.paper',
              position: 'relative', overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center'
            }}>
              <Box sx={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.1, transform: 'rotate(-15deg)' }}>
                <Printer size={120} />
              </Box>
              <CardContent sx={{ p: 3, width: '100%', position: 'relative', zIndex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>New Print Job</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>Upload PDF and release at any kiosk instantly.</Typography>
                <Button 
                  fullWidth variant="contained" 
                  onClick={() => window.location.href='/dashboard/upload'}
                  sx={{ bgcolor: 'background.paper', color: 'text.primary', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: alpha('#fff', 0.9) } }}
                >
                  Upload Now
                </Button>
              </CardContent>
            </Card>

            {/* Kiosk Status */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Zap size={18} color="#ed6c02" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Nearby Kiosks</Typography>
                </Box>
                <Stack spacing={2}>
                  {kiosks.map((k, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.name}</Typography>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: k.status === 'online' ? 'success.main' : 'error.main', boxShadow: (theme) => `0 0 8px ${k.status === 'online' ? theme.palette.success.main : theme.palette.error.main}` }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* QR Code Dialog */}
      <Dialog open={!!qrJob} onClose={() => setQrJob(null)} PaperProps={{ sx: { borderRadius: 4, p: 2, maxWidth: 350 } }}>
        <DialogTitle sx={{ fontWeight: 900, px: 2, display: 'flex', justifyContent: 'space-between' }}>
          Scan to Print
          <IconButton size="small" onClick={() => setQrJob(null)}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 4 }}>
          {qrJob?.release_code && (
            <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'inline-block', mb: 2 }}>
              <QRCodeSVG value={qrJob.release_code} size={180} />
            </Box>
          )}
          <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main', letterSpacing: 4, mb: 1 }}>
            {qrJob?.release_code}
          </Typography>
          <Typography variant="caption" color="text.secondary">Scan at kiosk to release your file</Typography>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}