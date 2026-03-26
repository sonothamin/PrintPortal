'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Typography, Box, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, IconButton, TextField, MenuItem, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, alpha, useTheme,
  Alert, Stack, Grid, Tooltip, CircularProgress, Divider
} from '@mui/material';
import { 
  Filter, Search, Eye, Download, Clock, CheckCircle2, XCircle,
  AlertCircle, Zap, RefreshCw, AlertTriangle, Trash2, FileText, 
  ExternalLink, User, Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PrintJob {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'canceled' | 'awaiting_verification';
  release_code: string;
  cost: number;
  page_count: number;
  is_color: boolean;
  user_id: string;
  profiles: { full_name: string } | null;
}

function GlobalQueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userIdFilter = searchParams.get('user_id');
  const theme = useTheme();

  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearJobsModalOpen, setClearJobsModalOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('print_jobs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (userIdFilter) query = query.eq('user_id', userIdFilter);

    const { data } = await query;
    if (data) setJobs(data as PrintJob[]);
    setLoading(false);
  }, [filterStatus, userIdFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRelease = async (jobId: string) => {
    setReleasing(jobId);
    setStatusMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('release-job', {
        body: { job_id: jobId }
      });
      if (error || !data.success) throw new Error(error?.message || data?.error || 'Release failed');
      
      setStatusMsg({ text: 'Job released successfully!', type: 'success' });
      if (data.file_url) window.open(data.file_url, '_blank');
      fetchJobs();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setReleasing(null);
    }
  };

  const getPreviewUrl = async (filePath: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600);
    if (data) setPreviewFile(data.signedUrl);
  };

  const filteredJobs = jobs.filter(job => 
    job.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.release_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    pending: jobs.filter(j => j.status === 'pending').length,
    today: jobs.filter(j => new Date(j.created_at).toDateString() === new Date().toDateString()).length,
    revenue: jobs.reduce((acc, curr) => acc + (curr.status === 'completed' ? curr.cost : 0), 0)
  };

  return (
    <AdminPortalLayout>
      {/* Header & Stats Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5 }}>Global Print Queue</Typography>
          <Typography color="text.secondary" sx={{ fontWeight: 500 }}>Real-time monitoring of network fulfillment.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" color="error" startIcon={<Trash2 size={16} />} onClick={() => setClearJobsModalOpen(true)} sx={{ fontWeight: 800, borderRadius: 2 }}>
            Purge Storage
          </Button>
          <Button variant="contained" onClick={fetchJobs} startIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} sx={{ fontWeight: 800, borderRadius: 2 }}>
            Sync Queue
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Active Tasks', value: stats.pending, icon: Clock, color: theme.palette.warning.main },
          { label: 'New Today', value: stats.today, icon: Zap, color: theme.palette.primary.main },
          { label: 'Total Revenue', value: `৳${stats.revenue.toFixed(2)}`, icon: CheckCircle2, color: theme.palette.success.main }
        ].map((stat, i) => (
          <Grid item xs={12} sm={4} key={i}>
            <Card variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(stat.color, 0.1), color: stat.color, display: 'flex' }}>
                <stat.icon size={24} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>{stat.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{stat.value}</Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {statusMsg && <Alert severity={statusMsg.type} sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>{statusMsg.text}</Alert>}

      {/* Main Table Card */}
      <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.default, 0.5), display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField 
            size="small" 
            placeholder="Search queue..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.5 }} /> }}
            sx={{ flexGrow: 1, maxWidth: 400, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
          />
          <TextField
            select
            size="small"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
          </TextField>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, py: 2 }}>DOCUMENT & USER</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>CONFIG</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>CODE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, pr: 3 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : filteredJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell sx={{ py: 2 }}>
                    <Stack spacing={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{job.file_name}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                         <User size={12} style={{ opacity: 0.5 }} />
                         <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                           {job.profiles?.full_name || 'Anonymous'}
                         </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Chip label={`${job.page_count}p`} size="small" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />
                      <Chip 
                        label={job.is_color ? 'COL' : 'B&W'} 
                        size="small" 
                        sx={{ 
                          fontWeight: 800, height: 20, fontSize: '0.65rem',
                          bgcolor: job.is_color ? alpha(theme.palette.primary.main, 0.1) : 'divider',
                          color: job.is_color ? 'primary.main' : 'text.primary'
                        }} 
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={job.status.replace('_', ' ')} 
                      size="small"
                      sx={{ 
                        fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', borderRadius: 1,
                        bgcolor: (theme) => {
                          const c = job.status === 'completed' ? theme.palette.success : job.status === 'pending' ? theme.palette.warning : theme.palette.error;
                          return alpha(c.main, 0.1);
                        },
                        color: (theme) => {
                          const c = job.status === 'completed' ? theme.palette.success : job.status === 'pending' ? theme.palette.warning : theme.palette.error;
                          return c.dark;
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.85rem', color: 'primary.main' }}>
                      {job.release_code}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 2 }}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {job.status === 'pending' && (
                        <Button 
                          size="small" 
                          variant="contained" 
                          disableElevation
                          onClick={() => handleRelease(job.id)}
                          disabled={releasing === job.id}
                          sx={{ borderRadius: 1.5, fontWeight: 900, fontSize: '0.7rem', py: 0.5, bgcolor: 'text.primary' }}
                        >
                          {releasing === job.id ? '...' : 'Release'}
                        </Button>
                      )}
                      <Tooltip title="View Source">
                        <IconButton size="small" onClick={() => getPreviewUrl(job.file_path)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                        <Download size={16} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Reusable Preview Dialog */}
      <Dialog open={!!previewFile} onClose={() => setPreviewFile(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 900 }}>
          Preview Document
          <IconButton onClick={() => setPreviewFile(null)}><XCircle size={20} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: '70vh', p: 0, bgcolor: 'black' }}>
          {previewFile && <iframe src={previewFile} width="100%" height="100%" style={{ border: 'none' }} title="Doc Preview" />}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" startIcon={<ExternalLink size={16} />} sx={{ borderRadius: 2, fontWeight: 800 }}>Open Fullscreen</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Modals (Styled) */}
      <Dialog open={clearJobsModalOpen} onClose={() => setClearJobsModalOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 900, color: 'error.main' }}>Confirm Purge</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This will delete all <strong>physical PDF files</strong> from storage. Database records remain. <strong>This cannot be undone.</strong></Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setClearJobsModalOpen(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
          <Button variant="contained" color="error" sx={{ fontWeight: 900, borderRadius: 2 }}>Confirm Purge</Button>
        </DialogActions>
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