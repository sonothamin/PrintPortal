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
  CircularProgress,
  Button
} from '@mui/material';
import {
  Search,
  FileText,
  Printer,
  RotateCw
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
      {/* --- Refined Dashboard Header --- */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5 }}>
            {loading ? <Skeleton width={150} /> : `Hey, ${data.profile?.full_name?.split(' ')[0] || 'User'}!`}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500 }}>
            {loading ? <Skeleton width={200} /> : "Your printing station is ready."}
          </Typography>
        </Box>

        {/* Transparent Dotted Balance Card */}
        <Card sx={{
          borderRadius: 3,
          bgcolor: 'transparent',
          border: '2px dotted',
          borderColor: (theme) => alpha(theme.palette.divider, 0.2),
          position: 'relative',
          overflow: 'hidden',
          minWidth: 220
        }}>
          <CardContent sx={{ p: 2, zIndex: 1, position: 'relative' }}>
            <Typography variant="overline" sx={{ opacity: 0.5, fontWeight: 900, lineHeight: 1, display: 'block' }}>
              Current Balance
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, letterSpacing: -1 }}>
              ৳{loading ? '0.00' : data.profile?.wallet_balance?.toFixed(2)}
            </Typography>
          </CardContent>
          <Wallet size={70} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.05, transform: 'rotate(-15deg)' }} />
        </Card>
      </Box>

      {/* --- Compact Activity Table --- */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>Recent Activity</Typography>
            <Button
              size="small"
              href="/dashboard/history"
              sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
              endIcon={<ExternalLink size={14} />}
            >
              View All
            </Button>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.65rem', py: 1.5 }}>DOCUMENT</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.65rem' }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.65rem' }}>CODE</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.65rem' }}>COST</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? [...Array(3)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4} sx={{ py: 2 }}><Skeleton height={24} /></TableCell></TableRow>
                )) : data.jobs.map((job) => (
                  <TableRow key={job.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }} noWrap>
                        {job.file_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      {job.release_code ? (
                        <Box
                          onClick={() => setQrJob(job)}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'pointer',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            transition: '0.2s',
                            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12) }
                          }}
                        >
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 900, color: 'primary.main' }}>
                            {job.release_code}
                          </Typography>
                          <QrCode size={12} className="text-primary" />
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ opacity: 0.3 }}>---</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.85rem' }}>
                        ৳{job.cost.toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>
    </DashboardLayout>
  );
}
