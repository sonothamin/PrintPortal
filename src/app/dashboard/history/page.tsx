'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
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
  CircularProgress
} from '@mui/material';
import {
  Search,
  FileText,
  Printer
} from 'lucide-react';

interface PrintJob {
  id: string;
  file_name: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'canceled';
  release_code: string;
  cost: number;
  kiosk_id: string | null;
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchJobs = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) setJobs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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
        <Typography color="text.secondary">
          Track and audit all your past printing activity on PrintPortal.
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 4, mb: 4, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center' }}>
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
            sx={{ maxWidth: 400 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
            {filteredJobs.length} JOBS FOUND
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.75rem' }}>DOCUMENT</TableCell>
                <TableCell sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.75rem' }}>DATE</TableCell>
                <TableCell sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.75rem' }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.75rem' }}>RELEASE CODE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.75rem' }}>COST</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length > 0 ? filteredJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05) }}>
                        <FileText size={20} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{job.file_name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {new Date(job.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={job.status} 
                      size="small" 
                      color={job.status === 'completed' ? 'success' : job.status === 'canceled' ? 'error' : 'warning'}
                      sx={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.65rem' }} 
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
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        display: 'inline-block'
                      }}
                    >
                      {job.release_code || '---'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    ৳{job.cost.toFixed(2)}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                    <Box sx={{ opacity: 0.3, mb: 2 }}><Printer size={48} /></Box>
                    <Typography color="text.secondary">No matching print records found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardLayout>
  );
}
