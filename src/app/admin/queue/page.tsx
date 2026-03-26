'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Typography, 
  Box, 
  Card, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  IconButton, 
  TextField, 
  MenuItem, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme,
  Alert,
  Tooltip,
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  Filter, 
  Search, 
  Eye, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Zap,
  RefreshCw,
  AlertTriangle,
  Trash2,
  FileText,
  User,
  Hash
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

function GlobalQueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userIdFilter = searchParams.get('user_id');
  const theme = useTheme();

  const [jobs, setJobs] = useState<any[]>([]);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  
  // Modals & Loading
  const [tempModalOpen, setTempModalOpen] = useState(false);
  const [clearingTemp, setClearingTemp] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [clearingQueue, setClearingQueue] = useState(false);
  
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const fetchJobs = React.useCallback(async () => {
    let query = supabase
      .from('print_jobs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (userIdFilter) query = query.eq('user_id', userIdFilter);

    const { data } = await query;
    if (data) setJobs(data as any);
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
      
      if (error) throw new Error(error.message);
      
      if (!data.success) {
        // Specific requirement: mapping "Insufficient balance" to "Release Failed"
        if (data.error?.includes("Insufficient balance")) {
            throw new Error("Release Failed: User does not have sufficient balance.");
        }
        throw new Error(data.error || 'Failed to release job.');
      }
      
      setStatusMsg({ text: 'Job released successfully!', type: 'success' });
      if (data.file_url) window.open(data.file_url, '_blank');
      fetchJobs();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setReleasing(null);
    }
  };

  const handlePurge = async (funcName: 'clear-temp-files' | 'clear-queue-uploads') => {
    const isTemp = funcName === 'clear-temp-files';
    isTemp ? setClearingTemp(true) : setClearingQueue(true);
    setStatusMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke(funcName);
      if (error) throw error;
      setStatusMsg({ 
        text: `Purge complete. ${data.count || 0} files removed.`, 
        type: 'success' 
      });
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Purge failed', type: 'error' });
    } finally {
      isTemp ? setClearingTemp(false) : setClearingQueue(false);
      setTempModalOpen(false);
      setQueueModalOpen(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.release_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusMap: Record<string, { color: any, icon: any }> = {
    pending: { color: 'warning', icon: <Clock size={14} /> },
    processing: { color: 'info', icon: <RefreshCw size={14} /> },
    completed: { color: 'success', icon: <CheckCircle2 size={14} /> },
    canceled: { color: 'error', icon: <XCircle size={14} /> },
  };

  return (
    <AdminPortalLayout>
      {/* Header & Main Actions */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>Global Queue</Typography>
          <Typography color="text.secondary">Real-time print fulfillment and storage maintenance</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<Trash2 size={18} />}
            onClick={() => setQueueModalOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Clear Storage
          </Button>
          <Button 
            variant="outlined" 
            color="warning" 
            startIcon={<AlertTriangle size={18} />}
            onClick={() => setTempModalOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Clear Temp
          </Button>
          <Button 
            variant="contained" 
            startIcon={<RefreshCw size={18} />} 
            onClick={fetchJobs}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {statusMsg && (
        <Alert severity={statusMsg.type} sx={{ mb: 3, borderRadius: 3, fontWeight: 600 }}>
          {statusMsg.text}
        </Alert>
      )}

      {/* Filters Card */}
      <Card sx={{ mb: 3, p: 2, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <Search size={18} style={{ marginRight: 8, opacity: 0.5 }} /> }}
          sx={{ flexGrow: 1, minWidth: '200px' }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          sx={{ minWidth: '150px' }}
        >
          <MenuItem value="all">All Status</MenuItem>
          {Object.keys(statusMap).map(s => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
        </TextField>
      </Card>

      {/* Main Table */}
      <TableContainer component={Card} sx={{ borderRadius: 4, border: 'none', boxShadow: theme.shadows[2] }}>
        <Table>
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>DOCUMENT</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>USER</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>COST</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>CODE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredJobs.map((job) => (
              <TableRow key={job.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }}>
                      <FileText size={20} color={theme.palette.primary.main} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{job.file_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{job.page_count} pages • {job.is_color ? 'Color' : 'B&W'}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <User size={14} />
                     <Typography variant="body2">{job.profiles?.full_name || 'Guest'}</Typography>
                   </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={job.status} 
                    size="small" 
                    icon={statusMap[job.status]?.icon}
                    color={statusMap[job.status]?.color || 'default'}
                    sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>৳{job.cost.toFixed(2)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontFamily: 'monospace', fontWeight: 900, color: 'primary.main' }}>
                    <Hash size={14} /> {job.release_code || '----'}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    {job.status === 'pending' && (
                      <Button 
                        variant="contained" 
                        size="small"
                        disableElevation
                        onClick={() => handleRelease(job.id)}
                        disabled={releasing === job.id}
                        sx={{ borderRadius: 1.5, fontWeight: 800, bgcolor: 'text.primary' }}
                      >
                        {releasing === job.id ? <CircularProgress size={16} color="inherit" /> : 'Release'}
                      </Button>
                    )}
                    <Tooltip title="View Meta">
                      <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirmation Modals */}
      <Dialog open={tempModalOpen} onClose={() => setTempModalOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Purge Temporary Files?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This will delete all files in the <code>/temp</code> storage bucket. These are typically failed or abandoned uploads.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTempModalOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => handlePurge('clear-temp-files')}
            disabled={clearingTemp}
          >
            {clearingTemp ? 'Clearing...' : 'Confirm Purge'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={queueModalOpen} onClose={() => setQueueModalOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Clear Finalized Storage?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This removes <strong>physical PDF files</strong> for all processed jobs to save space. Metadata records in the database will remain.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQueueModalOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => handlePurge('clear-queue-uploads')}
            disabled={clearingQueue}
          >
            {clearingQueue ? 'Clearing...' : 'Confirm Purge'}
          </Button>
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