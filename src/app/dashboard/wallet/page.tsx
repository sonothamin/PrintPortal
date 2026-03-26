'use client';

import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Box, Typography, Grid, Card, CardContent, Button, TextField, 
  Divider, List, ListItem, ListItemText, ListItemIcon, 
  InputAdornment, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, IconButton, Stack
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
  const [isScanning, setIsScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    if (txRes.data) setTransactions(txRes.data);
    
    if (spentRes.data) {
      const total = spentRes.data.reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
      setTotalSpent(total);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecharge = React.useCallback(async () => {
    setRecharging(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      if (!rechargeAmount) throw new Error('Please enter a valid token code');

      const { data, error } = await supabase.functions.invoke('redeem-token', {
        body: { token_code: rechargeAmount }
      });

      if (error) throw new Error(error.message || 'Failed to connect to redemption server');
      if (data.success === false) throw new Error(data.error || 'Invalid or already used token');

      setStatusMsg({ text: `Success! ৳${data.amount_added} added.`, type: 'success' });
      setRechargeAmount('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'An error occurred', type: 'error' });
    } finally {
      setRecharging(false);
    }
  }, [rechargeAmount, fetchData]);

  const scannerRef = useRef<Html5Qrcode | null>(null);

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
            setRechargeAmount(decodedText);
            setQrOpen(false);
            handleRecharge();
          },
          () => {}
        ).catch(console.error);
      }, 300);
    }
    return () => {
      clearTimeout(timeoutId);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      }
    };
  }, [qrOpen, handleRecharge]);

  return (
    <DashboardLayout>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5 }}>Wallet</Typography>
          <Typography color="text.secondary" variant="body2">Manage credits and top up via secure tokens.</Typography>
        </Box>
        <IconButton onClick={fetchData} disabled={refreshing} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <RotateCw size={20} className={refreshing ? 'animate-spin' : ''} />
        </IconButton>
      </Box>

      {/* Side by Side Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Balance Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%', borderRadius: 4, bgcolor: 'text.primary', color: 'background.paper',
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column'
          }}>
            <CardContent sx={{ p: 4, flexGrow: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)' }}>
                  <Wallet size={24} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Available Balance</Typography>
              </Stack>
              <Typography variant="h2" sx={{ fontWeight: 900, mb: 1 }}>৳{balance.toFixed(2)}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>Standard credits for all printing jobs.</Typography>
            </CardContent>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Box sx={{ px: 4, py: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700 }}>Lifetime Spent</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800 }}>৳{totalSpent.toFixed(2)}</Typography>
            </Box>
          </Card>
        </Grid>

        {/* Recharge Card */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%', borderRadius: 4, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Redeem Token</Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField 
                  fullWidth 
                  placeholder="CODE-XXXX-XXXX" 
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value.toUpperCase())}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Zap size={18} /></InputAdornment> }}
                />
                <Button 
                  variant="outlined" 
                  onClick={() => setQrOpen(true)}
                  sx={{ borderRadius: 2, minWidth: 56, borderColor: 'divider' }}
                >
                  <QrCode size={20} />
                </Button>
              </Stack>
              <Button 
                fullWidth variant="contained" size="large"
                disabled={!rechargeAmount || recharging}
                onClick={handleRecharge}
                sx={{ 
                  bgcolor: 'text.primary', color: 'background.paper', fontWeight: 800, borderRadius: 2,
                  '&:hover': { bgcolor: 'primary.main' }
                }}
              >
                {recharging ? <CircularProgress size={24} color="inherit" /> : 'Apply Top Up'}
              </Button>

              {statusMsg.text && (
                <Fade in>
                  <Box sx={{ 
                    mt: 2, p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1,
                    bgcolor: statusMsg.type === 'success' ? 'success.900' : 'error.900',
                    color: statusMsg.type === 'success' ? 'success.main' : 'error.main'
                  }}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>{statusMsg.text}</Typography>
                  </Box>
                </Fade>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                  bgcolor: tx.type === 'recharge' ? 'success.900' : 'action.hover',
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

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Scan Token</DialogTitle>
        <DialogContent sx={{ p: 0 }}><Box id="reader" sx={{ width: '100%', aspectRatio: '1/1' }} /></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setQrOpen(false)} color="inherit">Cancel</Button></DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}