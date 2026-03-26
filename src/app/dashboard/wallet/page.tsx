'use client';

import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Divider, List, ListItem, ListItemText, ListItemIcon,
  InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, IconButton, useTheme, alpha, Fade
} from '@mui/material';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, QrCode,
  History, Zap, CheckCircle2, RotateCw, X
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'recharge' | 'payment';
  description: string;
  created_at: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rechargeAmount, setRechargeAmount] = useState<string>('');
  const [recharging, setRecharging] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [qrOpen, setQrOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const theme = useTheme();
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const fetchData = React.useCallback(async () => {
    setRefreshing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setRefreshing(false);
      return;
    }

    const [profileRes, txRes, spentRes] = await Promise.all([
      supabase.from('profiles').select('wallet_balance').eq('id', session.user.id).single(),
      supabase.from('transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('amount').eq('user_id', session.user.id).eq('type', 'payment')
    ]);

    if (profileRes.data) setBalance(profileRes.data.wallet_balance);
    if (txRes.data) setTransactions(txRes.data || []);

    if (spentRes.data) {
      const total = spentRes.data.reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
      setTotalSpent(total);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecharge = React.useCallback(async (codeOverride?: string) => {
    const codeToUse = codeOverride || rechargeAmount;
    if (!codeToUse) return;

    setRecharging(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('redeem-token', {
        body: { token_code: codeToUse }
      });

      if (error) throw new Error(error.message || 'Failed to connect');
      if (data.success === false) throw new Error(data.error || 'Invalid token');

      setStatusMsg({ text: `Success! ৳${data.amount_added} added.`, type: 'success' });
      setRechargeAmount('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'An error occurred', type: 'error' });
    } finally {
      setRecharging(false);
    }
  }, [rechargeAmount, fetchData]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (qrOpen) {
      timeoutId = setTimeout(() => {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            setQrOpen(false);
            setRechargeAmount(decodedText);
            handleRecharge(decodedText);
          },
          () => { }
        ).catch(console.error);
      }, 300);
    }
    return () => {
      clearTimeout(timeoutId);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => { });
      }
    };
  }, [qrOpen, handleRecharge]);

  return (
    <DashboardLayout>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5 }}>Wallet</Typography>
          <Typography color="text.secondary" variant="body2">Manage credits and top up via secure tokens.</Typography>
        </Box>
        <IconButton onClick={fetchData} disabled={refreshing} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <RotateCw size={20} className={refreshing ? 'animate-spin' : ''} />
        </IconButton>
      </Box>

      {/* Main Grid - Note: 'item' removed, 'size' prop added */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        
        {/* Balance Card - Compact (33% width) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{
            height: '100%', borderRadius: 4, bgcolor: 'text.primary', color: 'background.paper',
            position: 'relative', overflow: 'hidden'
          }}>
            <CardContent sx={{ p: 4, flexGrow: 1, zIndex: 1 }}>
              <Typography variant="overline" sx={{ opacity: 0.5, fontWeight: 900, letterSpacing: 1.5 }}>
                Available Credits
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 900, mt: 1, mb: 0.5, letterSpacing: -2 }}>
                ৳{balance.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>Valid for all services</Typography>
            </CardContent>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

            <Box sx={{ px: 4, py: 2, bgcolor: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700 }}>Total Spent</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>৳{totalSpent.toFixed(2)}</Typography>
            </Box>
            <Wallet size={120} style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.05, transform: 'rotate(-15deg)' }} />
          </Card>
        </Grid>

        {/* Recharge Card - Functional (66% width) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ height: '100%', borderRadius: 4, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Top Up Account</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Redeem a voucher code or scan a QR code.
              </Typography>

              <Grid container spacing={2} alignItems="flex-start">
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    placeholder="VOUCHER-CODE"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value.toUpperCase())}
                    InputProps={{ sx: { borderRadius: 3, height: 56 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Button
                    fullWidth variant="outlined" onClick={() => setQrOpen(true)}
                    startIcon={<QrCode size={20} />}
                    sx={{ borderRadius: 3, height: 56, fontWeight: 700 }}
                  >
                    Scan QR
                  </Button>
                </Grid>
              </Grid>

              <Button
                fullWidth variant="contained" size="large"
                disabled={!rechargeAmount || recharging}
                onClick={() => handleRecharge()}
                sx={{ mt: 2, py: 1.8, bgcolor: 'text.primary', color: 'background.paper', fontWeight: 900, borderRadius: 3 }}
              >
                {recharging ? <CircularProgress size={24} color="inherit" /> : 'Confirm Redemption'}
              </Button>

              {statusMsg.text && (
                <Fade in={true}>
                  <Box sx={{
                    mt: 2, p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                    bgcolor: statusMsg.type === 'success' ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                    color: statusMsg.type === 'success' ? 'success.main' : 'error.main',
                    border: '1px solid', borderColor: 'currentColor'
                  }}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{statusMsg.text}</Typography>
                  </Box>
                </Fade>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transaction History Section */}
      <Card variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Transaction History</Typography>
          <History size={18} style={{ opacity: 0.3 }} />
        </Box>
        <Divider />
        <List disablePadding>
          {transactions.length > 0 ? transactions.map((tx, idx) => (
            <ListItem key={tx.id} divider={idx < transactions.length - 1} sx={{ px: 3, py: 2 }}>
              <ListItemIcon sx={{ minWidth: 48 }}>
                <Box sx={{
                  p: 1, borderRadius: 1.5,
                  bgcolor: tx.type === 'recharge' ? alpha(theme.palette.success.main, 0.1) : 'action.hover',
                  color: tx.type === 'recharge' ? 'success.main' : 'text.primary'
                }}>
                  {tx.type === 'recharge' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>{tx.description}</Typography>}
                secondary={<Typography variant="caption" sx={{ opacity: 0.5 }}>{new Date(tx.created_at).toLocaleDateString()}</Typography>}
              />
              <Typography variant="body2" sx={{ fontWeight: 900, color: tx.type === 'recharge' ? 'success.main' : 'inherit' }}>
                {tx.type === 'recharge' ? '+' : '-'}৳{Math.abs(Number(tx.amount)).toFixed(2)}
              </Typography>
            </ListItem>
          )) : (
            <Box sx={{ p: 6, textAlign: 'center', opacity: 0.5 }}>
              <Typography variant="body2">No transactions recorded yet.</Typography>
            </Box>
          )}
        </List>
      </Card>

      {/* QR Scanner Dialog */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Scan Token</DialogTitle>
        <DialogContent sx={{ p: 0 }}><Box id="reader" sx={{ width: '100%', aspectRatio: '1/1' }} /></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setQrOpen(false)} color="inherit">Cancel</Button></DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}