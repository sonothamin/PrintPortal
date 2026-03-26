'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Typography, Box, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, IconButton, TextField, MenuItem, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, alpha, useTheme,
  Alert, Stack, Tooltip, CircularProgress, Menu, Divider
} from '@mui/material';
import { 
  Search, Eye, Clock, CheckCircle2, XCircle,
  AlertCircle, Zap, RefreshCw, RotateCcw, QrCode, User, 
  ChevronDown, FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

// Status Configuration mapping
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
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrJob, setQrJob] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Status Menu State
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

  const openStatusMenu = (event: React.MouseEvent<HTMLElement>, jobId: string) => {
    setAnchorEl(event.currentTarget);
    setActiveJobId(jobId);
  };

  const closeStatusMenu = () => {
    setAnchorEl(null);
    setActiveJobId(null);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!activeJobId) return;
    const { error } = await supabase.from('print_jobs').update({ status: newStatus }).eq('id', activeJobId);
    if (!error) {
      setJobs(prev => prev.map(j => j.id === activeJobId ? { ...j, status: newStatus } : j));
      setStatusMsg({ text: `Status changed to ${newStatus}`, type: 'success' });
    } else {
      setStatusMsg({ text: 'Update failed', type: 'error' });
    }
    closeStatusMenu();
  };

  const handleRelease = async (jobId: string) => {
    setReleasing(jobId);
    try {
      const { data, error } = await supabase.functions.invoke('release-job', { body: { job_id: jobId } });
      if (error || !data.success) throw new Error(error?.message || 'Release failed');
      setStatusMsg({ text: 'Print job released!', type: 'success' });
      fetchJobs();
    } catch (err: any) { 
      setStatusMsg({ text: err.message, type: 'error' }); 
    } finally { 
      setReleasing(null); 
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
          <Typography color="text.secondary" sx={{ fontWeight: 500 }}>Global Print Queue Management</Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={fetchJobs} 
          startIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} 
          sx={{ fontWeight: 800, borderRadius: 2, px: 3, boxShadow: 0 }}
        >
          Sync
        </Button>
      </Box>

      {statusMsg && (
        <Alert severity={statusMsg.type} onClose={() => setStatusMsg(null)} sx={{ mb: 3, borderRadius: 2, fontWeight: 700 }}>
          {statusMsg.text}
        </Alert>
      )}

      {/* Stats Quick-View Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', display: 'flex' }}>
            <Clock size={24} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>Waiting</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>{jobs.filter(j => j.status === 'pending').length}</Typography>
          </Box>
        </Card>
      </Box>

      {/* Main Table Container */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, bgcolor: alpha(theme.palette.background.default, 0.5), borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
          <TextField 
            size="small" 
            placeholder="Search filename, user, or code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ 
              startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.5 }} />,
            }}
            sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
          />
          <TextField
            select
            size="small"
            label="Filter Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
          >
            <MenuItem value="all">All Jobs</MenuItem>
            {Object.keys(STATUS_CONFIG).map(s => (
              <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
            ))}
          </TextField>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, py: 2 }}>DOCUMENT & USER</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>CODE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, pr: 3 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 10 }}><CircularProgress size={30} /></TableCell></TableRow>
              ) : filteredJobs.map((job) => {
                const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;

                return (
                  <TableRow key={job.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main', display: 'flex' }}>
                          <FileText size={18} />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{job.file_name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <User size={10} /> {job.profiles?.full_name || 'Guest User'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={<StatusIcon size={14} className={job.status === 'processing' ? 'animate-pulse' : ''} />}
                        label={config.label}
                        onClick={(e) => openStatusMenu(e, job.id)}
                        onDelete={(e) => openStatusMenu(e as any, job.id)}
                        deleteIcon={<ChevronDown size={14} />}
                        sx={{ 
                          fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', borderRadius: 1.5,
                          bgcolor: alpha(theme.palette[config.color].main, 0.1),
                          color: theme.palette[config.color].dark,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: alpha(theme.palette[config.color].main, 0.2) },
                          '& .MuiChip-deleteIcon': { color: 'inherit', '&:hover': { color: 'inherit' } }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05), px: 1, borderRadius: 1, display: 'inline-block' }}>
                        {job.release_code || '---'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 2 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {job.status === 'pending' && (
                          <Button 
                            size="small" variant="contained" disableElevation
                            onClick={() => handleRelease(job.id)}
                            disabled={releasing === job.id}
                            sx={{ borderRadius: 1.5, fontWeight: 900, fontSize: '0.7rem', bgcolor: 'text.primary', color: 'background.paper', '&:hover': { bgcolor: 'grey.900' } }}
                          >
                            {releasing === job.id ? '...' : 'Release'}
                          </Button>
                        )}
                        <Tooltip title="View QR">
                          <IconButton size="small" onClick={() => setQrJob(job)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                            <QrCode size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Details">
                          <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Status Selection Menu */}
      <Menu 
        anchorEl={anchorEl} 
        open={Boolean(anchorEl)} 
        onClose={closeStatusMenu} 
        PaperProps={{ sx: { borderRadius: 3, minWidth: 200, mt: 1, boxShadow: theme.shadows[4] } }}
      >
        <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 900, color: 'text.disabled' }}>UPDATE STATUS</Typography></Box>
        <Divider />
        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
          <MenuItem key={key} onClick={() => handleStatusUpdate(key)} sx={{ py: 1.2, fontSize: '0.8rem', fontWeight: 700, gap: 1.5 }}>
            <Box sx={{ color: `${val.color}.main`, display: 'flex' }}><val.icon size={16} /></Box> 
            {val.label}
          </MenuItem>
        ))}
      </Menu>

      {/* QR Code Dialog */}
      <Dialog open={!!qrJob} onClose={() => setQrJob(null)} PaperProps={{ sx: { borderRadius: 4, p: 2, textAlign: 'center' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Release Code</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <QRCodeSVG value={qrJob?.release_code || ''} size={200} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'monospace', letterSpacing: 2 }}>
            {qrJob?.release_code}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button onClick={() => setQrJob(null)} fullWidth variant="outlined" sx={{ fontWeight: 800, borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </AdminPortalLayout>
  );
}

export default function GlobalQueuePage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress thickness={5} /></Box>}>
      <GlobalQueueContent />
    </Suspense>
  );
}