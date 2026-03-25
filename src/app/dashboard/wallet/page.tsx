'use client';

import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  TextField, 
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  QrCode, 
  History, 
  Zap,
  CheckCircle2
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
  const [rechargeAmount, setRechargeAmount] = useState<string>(''); // Renamed from token
  const [recharging, setRecharging] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [qrOpen, setQrOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // Renamed from scanning

  const fetchData = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecharge = React.useCallback(async () => { // Added useCallback
    setRecharging(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (!rechargeAmount) throw new Error('Please enter a valid token code'); // Using rechargeAmount

      // Call the highly secure Edge Function
      const { data, error } = await supabase.functions.invoke('redeem-token', {
        body: { token_code: rechargeAmount } // Using rechargeAmount
      });

      if (error) {
        throw new Error(error.message || 'Failed to connect to redemption server');
      }

      if (data.success === false) {
        throw new Error(data.error || 'Invalid or already used token');
      }

      setStatusMsg({ text: `Success! ৳${data.amount_added} added to your wallet.`, type: 'success' });
      setRechargeAmount(''); // Clearing rechargeAmount
      fetchData();
    } catch (err: any) {
      // Better UX error handling
      const message = err.message || 'An unexpected error occurred';
      setStatusMsg({ text: message, type: 'error' });
    } finally {
      setRecharging(false);
    }
  }, [rechargeAmount, fetchData]); // Added dependencies

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let timeoutId: NodeJS.Timeout;

    if (qrOpen) {
      setIsScanning(true); // Set scanning state
      // Small delay to ensure the Dialog's DOM is rendered
      timeoutId = setTimeout(() => {
        const element = document.getElementById("reader");
        if (!element) return;

        scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
        
        scanner.start(
          { facingMode: "environment" }, 
          config, 
          (decodedText) => {
            setRechargeAmount(decodedText); // Set rechargeAmount
            setQrOpen(false);
            setIsScanning(false); // Stop scanning state
          },
          () => {} // ignore scan errors
        ).catch(err => {
          console.error("Scanning failed", err);
          setIsScanning(false); // Stop scanning state on error
        });
      }, 300);
    }

    return () => {
      clearTimeout(timeoutId);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(console.error);
        } else {
          try {
            scannerRef.current.clear();
          } catch {
            // ignore cleanup errors if already cleared
          }
        }
      }
      setIsScanning(false); // Ensure scanning state is false on unmount/close
    };
  }, [qrOpen]);

  // Handle auto-recharge on successful scan
  const justScanned = useRef(false);
  useEffect(() => {
    if (qrOpen) justScanned.current = true;
    
    if (rechargeAmount && rechargeAmount.length > 5 && !qrOpen && !recharging && justScanned.current) { // Using rechargeAmount
       justScanned.current = false;
       handleRecharge();
    }
  }, [rechargeAmount, qrOpen, recharging, handleRecharge]); // Added handleRecharge to dependencies

  return (
    <DashboardLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          My Wallet
        </Typography>
        <Typography color="text.secondary">
          Manage your printing credits and top up via secure tokens.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Balance Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              bgcolor: 'text.primary', 
              color: 'background.default', 
              p: 2,
              boxShadow: (theme) => theme.palette.mode === 'dark' 
                ? '0 20px 25px -5px rgb(255 255 255 / 0.05)'
                : '0 20px 25px -5px rgb(0 0 0 / 0.1)'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 1, borderRadius: 2 }}>
                  <Wallet size={24} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Available Credits</Typography>
              </Box>
              <Typography variant="h2" sx={{ fontWeight: 900, mb: 1 }}>৳{balance.toFixed(2)}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
                Credits never expire. Used for all PrintPortal printing activities.
              </Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Total Spent</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>৳{totalSpent.toFixed(2)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Up Section */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                Top Up with Token
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Enter the 12-digit secret code from your recharge card or scan the QR code.
                  </Typography>
                  <TextField 
                    fullWidth 
                    placeholder="XXXX-XXXX-XXXX" 
                    value={rechargeAmount} // Using rechargeAmount
                    onChange={() => setRechargeAmount(prev => prev.slice(0, 6))}
 // Setting rechargeAmount
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Zap size={20} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                  <Button 
                    variant="contained" 
                    size="large" 
                    disabled={!rechargeAmount || recharging}
                    onClick={handleRecharge}
                    sx={{ 
                      bgcolor: 'text.primary', 
                      color: 'background.default',
                      borderRadius: 2, 
                      px: 4,
                      '&:hover': { bgcolor: 'text.secondary' } 
                    }}
                  >
                    {recharging ? 'Processing...' : 'Apply Token'}
                  </Button>
                  
                  {statusMsg.text && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: statusMsg.type === 'success' ? 'success.main' : 'error.main' }}>
                      {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <History size={18} />}
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{statusMsg.text}</Typography>
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box 
                    onClick={() => setQrOpen(true)}
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'divider', 
                      borderRadius: 3, 
                      p: 3, 
                      textAlign: 'center',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'grey.50',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'grey.100' }
                    }}
                  >
                    <QrCode size={64} strokeWidth={1.5} />
                    <Typography variant="caption" sx={{ mt: 2, fontWeight: 700 }}>
                      Scan QR Code
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card variant="outlined" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  Transaction History
                </Typography>
              </Box>
              <Divider />
              <List disablePadding>
                {transactions.length > 0 ? transactions.map((tx, idx) => (
                  <ListItem 
                    key={tx.id} 
                    divider={idx < transactions.length - 1}
                    sx={{ p: 3 }}
                  >
                    <ListItemIcon>
                      <Box 
                        sx={{ 
                          bgcolor: tx.type === 'recharge' ? 'success.900' : 'background.paper', 
                          border: '1px solid',
                          borderColor: 'divider',
                          p: 1.5, 
                          borderRadius: 2,
                          color: tx.type === 'recharge' ? 'success.main' : 'primary.main'
                        }}
                      >
                        {tx.type === 'recharge' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </Box>
                    </ListItemIcon>
                    <ListItemText 
                      primary={tx.description} 
                      primaryTypographyProps={{ fontWeight: 700 }}
                      secondary={new Date(tx.created_at).toLocaleDateString()}
                    />
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 800, 
                        color: tx.type === 'recharge' ? 'success.main' : 'primary.main' 
                      }}
                    >
                      {tx.type === 'recharge' ? '+' : '-'}৳{Math.abs(Number(tx.amount)).toFixed(2)}
                    </Typography>
                  </ListItem>
                )) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No transactions yet.</Typography>
                  </Box>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR Scanner Dialog */}
      <Dialog 
        open={qrOpen} 
        onClose={() => setQrOpen(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Scan Recharge QR</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 0 }}>
           <Box id="reader" sx={{ width: '100%', aspectRatio: '1/1', bgcolor: '#000', '& video': { objectFit: 'cover !important', width: '100% !important', height: '100% !important' } }} />
           {isScanning && (
             <Box sx={{ py: 3, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 2, px: 4 }}>
               <CircularProgress size={30} sx={{ color: 'white', mb: 1 }} />
               <Typography variant="body2" sx={{ color: 'white', fontWeight: 700 }}>Processing...</Typography>
             </Box>
           )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setQrOpen(false)} color="inherit">Cancel</Button>
          <Typography variant="caption" sx={{ flexGrow: 1, textAlign: 'center', opacity: 0.5 }}>
            Place code within view finder
          </Typography>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
