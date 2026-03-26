'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import {
  Typography, 
  Card, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip,
  alpha,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Search,
  FileText,
  Printer,
  RotateCw,
  QrCode,
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface PrintJob {
  id: string;
  file_name: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'canceled';
  release_code: string;
  cost: number;
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [qrJob, setQrJob] = useState<PrintJob | null>(null);
  const [cancelJob, setCancelJob] = useState<PrintJob | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) setJobs(data as PrintJob[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCancelAction = async () => {
    if (!cancelJob) return;
    setIsCancelling(true);

    const { error } = await supabase
      .from('print_jobs')
      .update({ status: 'canceled' })
      .eq('id', cancelJob.id);

    if (!error) {
      setJobs(prev => prev.map(j => j.id === cancelJob.id ? { ...j, status: 'canceled' } : j));
    }
    
    setIsCancelling(false);
    setCancelJob(null);
  };

  const filteredJobs = jobs.filter(job => 
    job.file_name.toLowerCase().includes(search.toLowerCase()) ||
    job.release_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: -1.5 }}>
          Print History
        </Typography>
        <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
          Track and audit all your past printing activity on PrintPortal.
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 2, mb: 4, overflow: 'hidden' }}>
        {/* Toolbar */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField 
            placeholder="Search by filename or code..." 
            size="small" 
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: { xs: '100%', sm: 400 } }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button 
            size="small" 
            variant="outlined" 
            onClick={fetchJobs}
            disabled={loading}
            startIcon={<RotateCw size={16} className={loading ? 'animate-spin' : ''} />}
            sx={{ fontWeight: 800, borderRadius: 2, color: 'text.primary' }}
          >
            Refresh
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.divider, 0.05) }}>
                <TableCell sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Document</TableCell>
                <TableCell sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Release Code</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <CircularProgress size={30} thickness={5} />
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length > 0 ? filteredJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), color: 'primary.main', display: 'flex' }}>
                        <FileText size={18} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{job.file_name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 500 }}>
                    {new Date(job.created_at).toLocaleDateString()}
                    <Typography variant="caption" display="block" sx={{ opacity: 0.6 }}>{new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={job.status} 
                      size="small" 
                      variant="soft"
                      color={job.status === 'completed' ? 'success' : job.status === 'canceled' ? 'error' : 'warning'}
                      sx={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.6rem', borderRadius: 1 }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 900, 
                        color: 'primary.main',
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                        px: 1, py: 0.5, borderRadius: 1, display: 'inline-block'
                      }}
                    >
                      {job.release_code || '---'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    ৳{job.cost.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {job.status === 'pending' && (
                        <>
                          <Tooltip title="View QR">
                            <IconButton size="small" onClick={() => setQrJob(job)} color="primary">
                              <QrCode size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel Job">
                            <IconButton size="small" onClick={() => setCancelJob(job)} sx={{ color: 'error.main' }}>
                              <Trash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {job.status !== 'pending' && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800 }}>LOCKED</Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Box sx={{ opacity: 0.2, mb: 1 }}><Printer size={48} /></Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>No matching print records found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* QR Code Dialog */}
      <Dialog 
        open={!!qrJob} 
        onClose={() => setQrJob(null)}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 360, textAlign: 'center' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Release QR
          <IconButton size="small" onClick={() => setQrJob(null)}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pb: 4 }}>
          {qrJob?.release_code && (
            <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <QRCodeSVG value={qrJob.release_code} size={220} level="H" />
            </Box>
          )}
          <Box>
            <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main', mb: 1 }}>
              {qrJob?.release_code}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Kiosk will scan this code to release your file.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog 
        open={!!cancelJob} 
        onClose={() => !isCancelling && setCancelJob(null)}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, color: 'error.main' }}>
          <AlertTriangle size={24} />
          Cancel Print Job?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
            Are you sure you want to cancel the print job for <strong>{cancelJob?.file_name}</strong>? 
            This action cannot be undone and your credits will be refunded.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setCancelJob(null)} sx={{ fontWeight: 800, color: 'text.secondary' }}>
            Go Back
          </Button>
          <Button 
            onClick={handleCancelAction} 
            variant="contained" 
            color="error"
            disabled={isCancelling}
            sx={{ fontWeight: 900, borderRadius: 2, px: 3 }}
          >
            {isCancelling ? 'Processing...' : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}