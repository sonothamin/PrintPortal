'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Typography, Box, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, IconButton, TextField, MenuItem, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, alpha, useTheme,
  Alert, Stack, Grid, Tooltip, CircularProgress, Menu
} from '@mui/material';
import { 
  Filter, Search, Eye, Download, Clock, CheckCircle2, XCircle,
  AlertCircle, Zap, RefreshCw, AlertTriangle, Trash2, FileText, 
  QrCode, User, ChevronDown, RotateCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

// Status Configuration
const STATUS_CONFIG: Record<string, { color: any, icon: any, label: string }> = {
  pending: { color: 'warning', icon: Clock, label: 'Pending' },
  processing: { color: 'info', icon: Zap, label: 'Processing' },
  completed: { color: 'success', icon: CheckCircle2, label: 'Completed' },
  canceled: { color: 'error', icon: XCircle, label: 'Canceled' },
  refunded: { color: 'secondary', icon: RotateCcw, label: 'Refunded' },
  awaiting_verification: { color: 'secondary', icon: AlertCircle, label: 'Verifying' },
};

function GlobalQueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userIdFilter = searchParams.get('user_id');
  const theme = useTheme();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrJob, setQrJob] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Status Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('print_jobs').select('*, profiles(full_name)').order('created_at', { ascending: false });
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (userIdFilter) query = query.eq('user_id', userIdFilter);
    const { data } = await query;
    if (data) setJobs(data);
    setLoading(false);
  }, [filterStatus, userIdFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedJobId) return;
    const { error } = await supabase.from('print_jobs').update({ status: newStatus }).eq('id', selectedJobId);
    if (!error) {
      setJobs(prev => prev.map(j => j.id === selectedJobId ? { ...j, status: newStatus } : j));
      setStatusMsg({ text: `Status updated to ${newStatus}`, type: 'success' });
    }
    setAnchorEl(null);
  };

  const handleRelease = async (jobId: string) => {
    setReleasing(jobId);
    try {
      const { data, error } = await supabase.functions.invoke('release-job', { body: { job_id: jobId } });
      if (error || !data.success) throw new Error(error?.message || 'Release failed');
      setStatusMsg({ text: 'Released!', type: 'success' });
      if (data.file_url) window.open(data.file_url, '_blank');
      fetchJobs();
    } catch (err: any) { setStatusMsg({ text: err.message, type: 'error' }); }
    finally { setReleasing(null); }
  };

  const filteredJobs = jobs.filter(job => 
    job.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.release_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5 }}>Global Queue</Typography>
        <Button variant="contained" onClick={fetchJobs} startIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} sx={{ fontWeight: 800, borderRadius: 2 }}>
          Sync
        </Button>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
          <TextField 
            size="small" fullWidth placeholder="Search..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <Search size={16} sx={{ mr: 1, opacity: 0.5 }} /> }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 900 }}>DOCUMENT/USER</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>CODE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredJobs.map((job) => {
                const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;

                return (
                  <TableRow key={job.id} hover>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{job.file_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{job.profiles?.full_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={<StatusIcon size={14} />}
                        label={config.label}
                        onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedJobId(job.id); }}
                        deleteIcon={<ChevronDown size={14} />}
                        onDelete={(e) => { setAnchorEl(e.currentTarget); setSelectedJobId(job.id); }}
                        sx={{ 
                          fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', borderRadius: 1.5,
                          bgcolor: alpha(theme.palette[config.color as 'primary'].main, 0.1),
                          color: theme.palette[config.color as 'primary'].dark,
                          '&:hover': { bgcolor: alpha(theme.palette[config.color as 'primary'].main, 0.2) }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main' }}>{job.release_code}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {job.status === 'pending' && (
                          <Button 
                            size="small" variant="contained" disableElevation
                            onClick={() => handleRelease(job.id)}
                            disabled={releasing === job.id}
                            sx={{ borderRadius: 1.5, fontWeight: 900, fontSize: '0.7rem', bgcolor: 'text.primary' }}
                          >
                            Release
                          </Button>
                        )}
                        <IconButton size="small" onClick={() => setQrJob(job)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                          <QrCode size={16} />
                        </IconButton>
                        <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                          <Eye size={16} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Status Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { borderRadius: 2, minWidth: 160, boxShadow: theme.shadows[3] } }}>
        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
          <MenuItem key={key} onClick={() => handleStatusUpdate(key)} sx={{ fontSize: '0.8rem', fontWeight: 700, gap: 1.5 }}>
            <val.icon size={16} /> {val.label}
          </MenuItem>
        ))}
      </Menu>

      {/* QR Dialog */}
      <Dialog open={!!qrJob} onClose={() => setQrJob(null)} PaperProps={{ sx: { borderRadius: 3, p: 2, textAlign: 'center' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Release QR Code</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid divider' }}>
            <QRCodeSVG value={qrJob?.release_code || ''} size={200} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>{qrJob?.release_code}</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setQrJob(null)} fullWidth sx={{ fontWeight: 800 }}>Close</Button></DialogActions>
      </Dialog>
    </AdminPortalLayout>
  );
}

export default function GlobalQueuePage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
      <GlobalQueueContent />
    </Suspense>
  );
}