'use client';

import React, { useEffect, useState } from 'react';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
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
  Alert
} from '@mui/material';
import { 
  Filter, 
  Search, 
  Eye, 
  Download, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Zap,
  RefreshCw,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Tooltip } from '@mui/material';

interface PrintJob {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  page_count: number;
  is_color: boolean;
  status: 'pending' | 'processing' | 'completed' | 'canceled';
  created_at: string;
  cost: number;
  release_code: string;
  profiles: {
    full_name: string;
  };
}

export default function GlobalQueuePage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearingTemp, setClearingTemp] = useState(false);
  const [clearJobsModalOpen, setClearJobsModalOpen] = useState(false);
  const [clearingJobs, setClearingJobs] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const theme = useTheme();

  const fetchJobs = async () => {
    setLoading(true);
    let query = supabase
      .from('print_jobs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (data) setJobs(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, [filterStatus]);

  const handleRelease = async (jobId: string) => {
    setReleasing(jobId);
    setStatusMsg(null);
    try {
      // Use the highly secure Edge Function for releasing print jobs
      const { data, error } = await supabase.functions.invoke('release-job', {
        body: { job_id: jobId }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to connect to the fulfillment server.');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to release job via Edge Function.');
      }
      
      setStatusMsg({ text: 'Job released successfully! Opening document...', type: 'success' });
      
      // The Edge Function returns a secure, short-lived signed URL for the document.
      if (data.file_url) {
        // Automatically open the printed document in a new tab for fulfillment
        window.open(data.file_url, '_blank');
      }

      fetchJobs();
    } catch (err: any) {
      let message = err.message || 'An unexpected error occurred while releasing the job.';
      if (message.includes('Edge Function returned a non-2xx status code')) {
         message = 'Fulfillment server rejected the request. Please check job status.';
      }
      setStatusMsg({ text: message, type: 'error' });
    } finally {
      setReleasing(null);
    }
  };

  const getPreviewUrl = async (filePath: string) => {
    setStatusMsg(null);
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);
    
    if (data) setPreviewFile(data.signedUrl);
    else setStatusMsg({ text: 'Error generating preview: ' + (error?.message || 'Unknown error'), type: 'error' });
  };

  const handleClearTempFiles = async () => {
    setClearingTemp(true);
    setStatusMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('clear-temp-files');
      if (error) throw new Error(error.message || 'Failed to connect to cleaner service.');
      if (!data.success) throw new Error(data.error || 'Failed to clear temp files.');
      
      setStatusMsg({ text: data.message || `Success! Cleared temp files.`, type: 'success' });
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'An unexpected error occurred.', type: 'error' });
    } finally {
      setClearingTemp(false);
      setClearModalOpen(false);
    }
  };

  const handleClearQueueUploads = async () => {
    setClearingJobs(true);
    setStatusMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('clear-queue-uploads');
      if (error) throw new Error(error.message || 'Failed to connect to cleaner service.');
      if (!data.success) throw new Error(data.error || 'Failed to clear queue uploads.');
      
      setStatusMsg({ text: data.message || `Success! Cleared all physical queue documents.`, type: 'success' });
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'An unexpected error occurred.', type: 'error' });
    } finally {
      setClearingJobs(false);
      setClearJobsModalOpen(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.release_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors: Record<string, 'warning' | 'info' | 'success' | 'error' | 'secondary'> = {
    awaiting_verification: 'secondary',
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    canceled: 'error'
  };

  const statusIcons: Record<string, React.ReactNode> = {
    awaiting_verification: <Search size={16} />,
    pending: <Clock size={16} />,
    processing: <Zap size={16} />,
    completed: <CheckCircle2 size={16} />,
    canceled: <XCircle size={16} />
  };

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, mb: 1 }}>
            Global Print Queue
          </Typography>
          <Typography color="text.secondary">
            Manage and monitor all print requests across the PrintPortal network.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" color="error" onClick={() => setClearJobsModalOpen(true)} startIcon={<Trash2 size={18} />} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Clear Queue Uploads
          </Button>
          <Button variant="outlined" color="error" onClick={() => setClearModalOpen(true)} startIcon={<AlertTriangle size={18} />} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Clear Temp Files
          </Button>
          <Button variant="contained" onClick={fetchJobs} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Refresh Data
          </Button>
        </Box>
      </Box>

      {statusMsg && (
        <Alert severity={statusMsg.type} sx={{ mb: 4, borderRadius: 3 }}>
          {statusMsg.text}
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center', bgcolor: (theme) => alpha(theme.palette.background.default, 0.5) }}>
          <Box sx={{ position: 'relative', flexGrow: 1, maxWidth: 400 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <TextField 
              fullWidth 
              size="small" 
              placeholder="Search by file, user, or code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { pl: 5, borderRadius: 2, bgcolor: 'background.paper' } }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Filter size={18} style={{ opacity: 0.5 }} />
            <TextField
              select
              size="small"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="canceled">Canceled</MenuItem>
            </TextField>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>DOCUMENT</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>STUDENT</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>DETAILS</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>COST</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>CODE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{job.file_name}</Typography>
                    <Typography variant="caption" color="text.secondary">ID: {job.id.slice(0,8)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{job.profiles?.full_name || 'System User'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>{job.page_count} Pages</Typography>
                    <Chip 
                      label={job.is_color ? 'Color' : 'B&W'} 
                      size="small" 
                      sx={{ height: 16, fontSize: '0.65rem', fontWeight: 800, bgcolor: job.is_color ? 'primary.main' : 'text.primary', color: 'background.default' }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={job.status} 
                      size="small" 
                      color={statusColors[job.status]} 
                      icon={statusIcons[job.status] as any}
                      variant="outlined"
                      sx={{ fontWeight: 800, textTransform: 'capitalize', px: 1 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>৳{job.cost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip label={job.release_code || '---'} size="small" sx={{ fontWeight: 900, fontFamily: 'monospace', borderRadius: 1 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {job.status === 'pending' && (
                        <Button 
                          size="small" 
                          variant="contained" 
                          onClick={() => handleRelease(job.id)}
                          disabled={releasing === job.id}
                          sx={{ py: 0, px: 1, fontSize: '0.75rem', fontWeight: 800, bgcolor: 'text.primary', color: 'background.default' }}
                        >
                          {releasing === job.id ? '...' : 'Release'}
                        </Button>
                      )}
                      <Tooltip title="Preview">
                        <IconButton size="small" onClick={() => getPreviewUrl(job.file_path)}><Eye size={18} /></IconButton>
                      </Tooltip>
                      <IconButton size="small"><Download size={18} /></IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                    <AlertCircle size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <Typography color="text.secondary" variant="h6">No print jobs matched your filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Preview Dialog */}
      <Dialog 
        open={!!previewFile} 
        onClose={() => setPreviewFile(null)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, bgcolor: '#000' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
          Document Preview
          <IconButton onClick={() => setPreviewFile(null)} sx={{ color: '#fff' }}><XCircle size={24} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {previewFile ? (
            previewFile.toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewFile} width="100%" height="100%" style={{ border: 'none' }} title="Preview" />
            ) : (
              <img src={previewFile} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )
          ) : (
             <Typography color="text.secondary">Loading preview...</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? '#111' : '#f5f5f5' }}>
          <Button onClick={() => setPreviewFile(null)}>Close</Button>
          <Button variant="contained" startIcon={<Download size={18} />}>Download Original</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Temp Files Confirmation Modal */}
      <Dialog 
        open={clearModalOpen} 
        onClose={() => !clearingTemp && setClearModalOpen(false)}
        PaperProps={{ sx: { borderRadius: 4, width: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle color={theme.palette.error.main} size={24} />
          Clear Temporary Files
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to permanently delete all abandoned files in the `temp/` storage directory? This action cannot be undone. Active print jobs will not be affected unless their files were improperly formatted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setClearModalOpen(false)} disabled={clearingTemp} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleClearTempFiles} 
            disabled={clearingTemp}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {clearingTemp ? 'Purging...' : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Queue Uploads Confirmation Modal */}
      <Dialog 
        open={clearJobsModalOpen} 
        onClose={() => !clearingJobs && setClearJobsModalOpen(false)}
        PaperProps={{ sx: { borderRadius: 4, width: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 color={theme.palette.error.main} size={24} />
          Clear Queue Uploads
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to permanently delete all physical PDF documents associated with queued & completed jobs? This strips the storage bucket to free up space. The record metadata will remain in the database, but users will no longer be able to download their receipt copies.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setClearJobsModalOpen(false)} disabled={clearingJobs} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleClearQueueUploads} 
            disabled={clearingJobs}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {clearingJobs ? 'Purging...' : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPortalLayout>
  );
}

