'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Typography, Box, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, IconButton, TextField, MenuItem, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, alpha, useTheme,
  Alert, Stack, Tooltip, CircularProgress, Menu, Divider, Paper
} from '@mui/material';
import { 
  Search, Eye, Clock, CheckCircle2, XCircle,
  AlertCircle, Zap, RefreshCw, RotateCcw, QrCode, User, 
  ChevronDown, FileText, Trash2, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_CONFIG: Record<string, { color: 'warning' | 'info' | 'success' | 'error' | 'secondary', icon: any, label: string }> = {
  pending: { color: 'warning', icon: Clock, label: 'Pending' },
  processing: { color: 'info', icon: Zap, label: 'Processing' },
  completed: { color: 'success', icon: CheckCircle2, label: 'Completed' },
  canceled: { color: 'error', icon: XCircle, label: 'Canceled' },
  refunded: { color: 'secondary', icon: RotateCcw, label: 'Refunded' },
  awaiting_verification: { color: 'secondary', icon: AlertCircle, label: 'Verifying' },
};

function GlobalQueueContent() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get('user_id');
  const theme = useTheme();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [purging, setPurging] = useState<'queue' | 'temp' | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrJob, setQrJob] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('print_jobs').select('*, profiles(full_name)').order('created_at', { ascending: false });
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (userIdFilter) query = query.eq('user_id', userIdFilter);
    const { data, error } = await query;
    if (!error && data) setJobs(data);
    setLoading(false);
  }, [filterStatus, userIdFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleRelease = async (jobId: string) => {
    setReleasing(jobId);
    try {
      const { data, error } = await supabase.functions.invoke('release-job', { body: { job_id: jobId } });
      
      // Handle Edge Function logical errors (like Insufficient Balance)
      if (error) throw new Error(error.message || 'Network error');
      if (data?.success === false) throw new Error(data.error || 'Release failed');

      setStatusMsg({ text: 'Print job released successfully!', type: 'success' });
      fetchJobs();
    } catch (err: any) { 
      setStatusMsg({ text: `Release Failed: ${err.message}`, type: 'error' }); 
    } finally { 
      setReleasing(null); 
    }
  };

  const handlePurge = async (type: 'queue' | 'temp') => {
    if (!confirm(`Are you sure you want to purge ${type} storage? This cannot be undone.`)) return;
    setPurging(type);
    const endpoint = type === 'queue' ? 'clear-queue-uploads' : 'clear-temp-files';
    
    try {
      const { data, error } = await supabase.functions.invoke(endpoint, { method: 'POST' });
      if (error || !data?.success) throw new Error(error?.message || 'Purge failed');
      setStatusMsg({ text: `Purged ${data.count || 0} files from ${type} storage.`, type: 'success' });
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setPurging(null);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.release_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5 }}>Mission Control</Typography>
          <Typography color="text.secondary" sx={{ fontWeight: 500 }}>System Health & Queue</Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={fetchJobs} 
          startIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} 
          sx={{ fontWeight: 800, borderRadius: 2, px: 3 }}
        >
          Sync
        </Button>
      </Box>

      {statusMsg && (
        <Alert severity={statusMsg.type} onClose={() => setStatusMsg(null)} sx={{ mb: 3, borderRadius: 2, fontWeight: 700 }}>
          {statusMsg.text}
        </Alert>
      )}

      {/* STORAGE MANAGEMENT SECTION */}
      <Card variant="outlined" sx={{ mb: 4, borderRadius: 3, borderColor: 'error.light', bgcolor: alpha(theme.palette.error.main, 0.01) }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid', borderColor: alpha(theme.palette.error.main, 0.1) }}>
          <ShieldAlert size={20} color={theme.palette.error.main} />
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'error.main' }}>SYSTEM MAINTENANCE (DANGER ZONE)</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2 }}>
          <Button 
            fullWidth 
            color="error" 
            variant="outlined" 
            startIcon={purging === 'queue' ? <CircularProgress size={14} /> : <Trash2 size={16} />}
            onClick={() => handlePurge('queue')}
            disabled={!!purging}
            sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none' }}
          >
            Purge Finalized Uploads
          </Button>
          <Button 
            fullWidth 
            color="error" 
            variant="outlined" 
            startIcon={purging === 'temp' ? <CircularProgress size={14} /> : <Trash2 size={16} />}
            onClick={() => handlePurge('temp')}
            disabled={!!purging}
            sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none' }}
          >
            Clear Temporary Cache
          </Button>
        </Stack>
      </Card>

      {/* Main Table Container */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, bgcolor: alpha(theme.palette.background.default, 0.5), borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField 
            size="small" fullWidth placeholder="Search queue..." 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.5 }} /> }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
          />
          <TextField
            select size="small" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            {Object.keys(STATUS_CONFIG).map(s => <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>)}
          </TextField>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 900 }}>DOCUMENT</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>CODE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, pr: 3 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 8 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : filteredJobs.map((job) => {
                const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                return (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main' }}><FileText size={18} /></Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{job.file_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{job.profiles?.full_name || 'Guest'}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={config.label} 
                        size="small"
                        sx={{ fontWeight: 900, bgcolor: alpha(theme.palette[config.color].main, 0.1), color: theme.palette[config.color].dark, borderRadius: 1.5 }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main' }}>{job.release_code || '---'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {job.status === 'pending' && (
                          <Button 
                            size="small" variant="contained" 
                            onClick={() => handleRelease(job.id)}
                            disabled={releasing === job.id}
                            sx={{ borderRadius: 1.5, fontWeight: 900, bgcolor: 'text.primary' }}
                          >
                            {releasing === job.id ? '...' : 'Release'}
                          </Button>
                        )}
                        <IconButton size="small" onClick={() => setQrJob(job)}><QrCode size={16} /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* QR Dialog */}
      <Dialog open={!!qrJob} onClose={() => setQrJob(null)} PaperProps={{ sx: { borderRadius: 4, p: 2, textAlign: 'center' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Release Code</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
            <QRCodeSVG value={qrJob?.release_code || ''} size={200} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>{qrJob?.release_code}</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setQrJob(null)} fullWidth variant="outlined">Close</Button></DialogActions>
      </Dialog>
    </AdminPortalLayout>
  );
}

export default function GlobalQueuePage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>}>
      <GlobalQueueContent />
    </Suspense>
  );
}