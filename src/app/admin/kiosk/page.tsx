'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  Tooltip,
  CircularProgress,
  Grid,
  Paper,
  Alert
} from '@mui/material';
import { 
  Search, 
  Plus, 
  Activity, 
  MapPin, 
  RefreshCcw, 
  Trash2, 
  Monitor,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Kiosk {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  last_ping: string | null;
  created_at: string;
}

export default function KioskManagementPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Kiosk Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newKiosk, setNewKiosk] = useState({ name: '', location: '' });
  const [addingKiosk, setAddingKiosk] = useState(false);

  // Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundJobId, setRefundJobId] = useState('');
  const [refunding, setRefunding] = useState(false);

  const fetchKiosks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kiosks')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) setKiosks(data);
    if (error) console.error('Error fetching kiosks:', error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKiosks();
  }, [fetchKiosks]);

  const handleAddKiosk = async () => {
    if (!newKiosk.name || !newKiosk.location) return;
    setAddingKiosk(true);
    try {
      const { error } = await supabase
        .from('kiosks')
        .insert([newKiosk]);
      
      if (error) throw error;
      setAddModalOpen(false);
      setNewKiosk({ name: '', location: '' });
      fetchKiosks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingKiosk(false);
    }
  };

  const handleRefund = async () => {
    if (!refundJobId) return;
    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke('kiosk-refund', {
        body: { print_job_id: refundJobId }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to process refund');
      }

      alert('Refund processed successfully!');
      setRefundModalOpen(false);
      setRefundJobId('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRefunding(false);
    }
  };

  const handleDeleteKiosk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this kiosk? This action cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('kiosks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchKiosks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isOnline = (lastPing: string | null) => {
    if (!lastPing) return false;
    const pingTime = new Date(lastPing).getTime();
    const now = new Date().getTime();
    return (now - pingTime) < 5 * 60 * 1000; // 5 minutes threshold
  };

  const filteredKiosks = kiosks.filter(k => 
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, mb: 1 }}>
            Kiosk Management
          </Typography>
          <Typography color="text.secondary">
            Monitor kiosk health, manage locations, and process remote terminal actions.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
          <Button 
            variant="outlined" 
            startIcon={<RotateCcw size={18} />} 
            sx={{ fontWeight: 700, borderRadius: 2 }}
            onClick={() => setRefundModalOpen(true)}
          >
            Terminal Refund
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Plus size={18} />} 
            sx={{ fontWeight: 700, borderRadius: 2 }}
            onClick={() => setAddModalOpen(true)}
          >
            Add Kiosk
          </Button>
        </Box>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: alpha('#4caf50', 0.1), color: '#4caf50', borderRadius: 2 }}>
              <CheckCircle2 size={24} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {kiosks.filter(k => isOnline(k.last_ping)).length}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.6 }}>ONLINE TERMINALS</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: alpha('#f44336', 0.1), color: '#f44336', borderRadius: 2 }}>
              <XCircle size={24} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {kiosks.filter(k => !isOnline(k.last_ping)).length}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.6 }}>OFFLINE TERMINALS</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: alpha('#2196f3', 0.1), color: '#2196f3', borderRadius: 2 }}>
              <Monitor size={24} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{kiosks.length}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.6 }}>TOTAL REGISTERED</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => alpha(theme.palette.background.default, 0.5) }}>
          <Box sx={{ position: 'relative', width: '100%', maxWidth: 450 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <TextField 
              fullWidth 
              size="small" 
              placeholder="Search kiosks by name or location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { pl: 5, borderRadius: 2, bgcolor: 'background.paper' } }}
            />
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>KIOSK NAME</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>LOCATION</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>LAST PING</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : filteredKiosks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                    <Typography color="text.secondary">No kiosks found.</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredKiosks.map((kiosk) => {
                const online = isOnline(kiosk.last_ping);
                return (
                  <TableRow key={kiosk.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1, bgcolor: 'text.primary', color: 'background.default', borderRadius: 1.5 }}>
                          <Monitor size={18} />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{kiosk.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{kiosk.id.split('-')[0]}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MapPin size={14} style={{ opacity: 0.5 }} />
                        <Typography variant="body2">{kiosk.location}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={online ? 'ONLINE' : 'OFFLINE'} 
                        size="small" 
                        color={online ? 'success' : 'error'}
                        icon={online ? <Activity size={12} /> : <Clock size={12} />}
                        sx={{ fontWeight: 800, fontSize: '0.65rem' }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {kiosk.last_ping ? new Date(kiosk.last_ping).toLocaleString() : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete Kiosk">
                        <IconButton size="small" color="error" onClick={() => handleDeleteKiosk(kiosk.id)}>
                          <Trash2 size={18} />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" onClick={() => fetchKiosks()}>
                        <RefreshCcw size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add Kiosk Dialog */}
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} PaperProps={{ sx: { borderRadius: 2, width: '100%', maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Register New Kiosk</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Kiosk Name"
              placeholder="e.g. Science Building A"
              fullWidth
              value={newKiosk.name}
              onChange={(e) => setNewKiosk({ ...newKiosk, name: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              label="Location"
              placeholder="e.g. Ground Floor, Lobby"
              fullWidth
              value={newKiosk.location}
              onChange={(e) => setNewKiosk({ ...newKiosk, location: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              After registration, use the Kiosk ID to configure the physical terminal.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setAddModalOpen(false)} disabled={addingKiosk}>Cancel</Button>
          <Button 
            onClick={handleAddKiosk} 
            variant="contained" 
            disabled={addingKiosk || !newKiosk.name || !newKiosk.location}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {addingKiosk ? <CircularProgress size={20} /> : 'Register Kiosk'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terminal Refund Dialog */}
      <Dialog open={refundModalOpen} onClose={() => setRefundModalOpen(false)} PaperProps={{ sx: { borderRadius: 2, width: '100%', maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Remote Terminal Refund</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Enter the Print Job ID to initiate a remote refund. This will reverse the transaction and return funds to the student's wallet.
          </Typography>
          <TextField
            autoFocus
            label="Print Job ID"
            placeholder="UUID format"
            fullWidth
            value={refundJobId}
            onChange={(e) => setRefundJobId(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRefundModalOpen(false)} disabled={refunding}>Cancel</Button>
          <Button 
            onClick={handleRefund} 
            variant="contained" 
            color="primary" 
            disabled={refunding || !refundJobId}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {refunding ? <CircularProgress size={20} /> : 'Process Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPortalLayout>
  );
}
