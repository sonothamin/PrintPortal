'use client';

import React, { useEffect, useState } from 'react';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { supabase } from '@/lib/supabase';
import { 
  Tabs, 
  Tab,
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
  Button, 
  Chip, 
  IconButton, 
  TextField,
  alpha,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import { 
  Ticket, 
  Trash2, 
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Copy,
  LayoutGrid,
  History as HistoryIcon,
  BarChart3,
  Printer as PrinterIcon,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Token {
  id: string;
  code: string;
  value: number;
  is_used: boolean;
  used_by: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 4 }}>{children}</Box>}
    </div>
  );
}

export default function TokenManagementPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [generateValue, setGenerateValue] = useState(100);
  const [generateCount, setGenerateCount] = useState(10);
  const [status, setStatus] = useState({ text: '', type: 'success' as 'success' | 'error' });
  const [circulationFilter, setCirculationFilter] = useState<'all' | 'active' | 'used'>('all');
  const [circulationSort, setCirculationSort] = useState<'newest' | 'oldest' | 'value_high' | 'value_low'>('newest');
  const [qrToken, setQrToken] = useState<Token | null>(null);

  const fetchTokens = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('recharge_tokens')
      .select('*, profiles:used_by(full_name)')
      .order('created_at', { ascending: false });
    
    if (data) setTokens(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const generateTokens = async () => {
    setStatus({ text: '', type: 'success' });
    try {
      const { data, error } = await supabase.functions.invoke('generate-tokens', {
        body: { count: generateCount, value: generateValue }
      });

      if (error) {
        throw new Error(error.message || 'Failed to connect to token generation server');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Token generation failed');
      }

      setStatus({ text: `Successfully generated ${data.count} vouchers worth ৳${data.value} each!`, type: 'success' });
      fetchTokens();
      setTabValue(1); // Switch to history
    } catch (err: any) {
      let message = err.message || 'Error generating tokens';
      if (message.includes('Edge Function returned a non-2xx')) {
        message = 'Server rejected the request. Please verify your admin permissions.';
      }
      setStatus({ text: message, type: 'error' });
    }
  };

  const deleteToken = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete-token', token_id: id }
      });
      if (error || !data?.success) {
        setStatus({ text: data?.error || error?.message || 'Failed to delete token', type: 'error' });
        return;
      }
      fetchTokens();
    } catch (err: any) {
      setStatus({ text: err.message, type: 'error' });
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Code', 'Value', 'Status', 'Created At'];
    const rows = tokens.map(t => [
      t.id,
      t.code,
      t.value,
      t.is_used ? 'Used' : 'Active',
      new Date(t.created_at).toISOString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tokens_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = {
    total: tokens.length,
    active: tokens.filter(t => !t.is_used).length,
    used: tokens.filter(t => t.is_used).length,
    totalValue: tokens.reduce((acc, curr) => acc + Number(curr.value), 0),
    usedValue: tokens.filter(t => t.is_used).reduce((acc, curr) => acc + Number(curr.value), 0)
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printableTokens = tokens.filter(t => !t.is_used).slice(0, 30); // 30 per sheet

    const html = `
      <html>
        <head>
          <title>Print Vouchers</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap');
            body { font-family: 'Merriweather', serif; margin: 0; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .voucher { border: 2px solid #000; padding: 15px; border-radius: 8px; text-align: center; position: relative; overflow: hidden; }
            .header { font-weight: 900; font-size: 12px; margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .value { font-size: 24px; font-weight: 900; margin: 10px 0; }
            .code { font-family: monospace; font-weight: 900; letter-spacing: 2px; background: #eee; padding: 5px; font-size: 14px; }
            .footer { font-size: 10px; margin-top: 10px; color: #666; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h2 style="text-align: center;">PrintPortal Vouchers</h2>
          <div class="grid">
            ${printableTokens.map(t => `
              <div class="voucher">
                <div class="header">PRINTPORTAL SERVICE</div>
                <div class="value">৳${t.value}</div>
                <div class="code">${t.code}</div>
                <div class="footer">Valid for single use. Scan at wallet top-up.</div>
              </div>
            `).join('')}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, mb: 1 }}>
            Token Management
          </Typography>
          <Typography color="text.secondary">
            Generate, track, and audit recharge tokens for the PrintPortal print system.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<FileSpreadsheet size={18} />} 
            onClick={exportToCSV}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Export All
          </Button>
          <Button 
            variant="contained" 
            startIcon={<PrinterIcon size={18} />} 
            onClick={handlePrint}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Print Sheet
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} aria-label="token manager tabs" sx={{
          '& .MuiTab-root': { fontWeight: 800, minHeight: 64 },
          '& .Mui-selected': { color: 'primary.main' }
        }}>
          <Tab icon={<LayoutGrid size={18} />} iconPosition="start" label="Token Generator" />
          <Tab icon={<HistoryIcon size={18} />} iconPosition="start" label="Circulation" />
          <Tab icon={<BarChart3 size={18} />} iconPosition="start" label="Global Statistics" />
        </Tabs>
      </Box>

      {/* Tab 1: Generator */}
      <CustomTabPanel value={tabValue} index={0}>
        <Grid container spacing={4} justifyContent="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>New Token Batch</Typography>
                
                {status.text && <Alert severity={status.type} sx={{ mb: 4, borderRadius: 2 }}>{status.text}</Alert>}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <TextField 
                    label="Token Denomination (৳)" 
                    type="number" 
                    fullWidth 
                    value={generateValue}
                    onChange={(e) => setGenerateValue(Number(e.target.value))}
                    helperText="Amount to be added to user's wallet per token"
                  />
                  <TextField 
                    label="Batch Quantity" 
                    type="number" 
                    fullWidth 
                    value={generateCount}
                    onChange={(e) => setGenerateCount(Number(e.target.value))}
                    helperText="Number of unique tokens to generate"
                  />
                  
                  <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">Total Value to Generate:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>৳{(generateValue * generateCount).toLocaleString()}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Tokens will be generated immediately and active upon insertion.
                    </Typography>
                  </Box>

                  <Button 
                    variant="contained" 
                    size="large" 
                    fullWidth 
                    onClick={generateTokens}
                    startIcon={<Ticket size={24} />}
                    sx={{ py: 2, fontWeight: 900, fontSize: '1.1rem', borderRadius: 3 }}
                  >
                    Generate Batch Now
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CustomTabPanel>

      {/* Tab 2: Circulation */}
      <CustomTabPanel value={tabValue} index={1}>
        <Card variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
          {/* Filter/Sort Bar */}
          <Box sx={{ p: 2.5, display: 'flex', gap: 2, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Status"
              value={circulationFilter}
              onChange={(e) => setCirculationFilter(e.target.value as any)}
              sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              SelectProps={{ native: true }}
            >
              <option value="all">All Tokens</option>
              <option value="active">Active Only</option>
              <option value="used">Redeemed Only</option>
            </TextField>
            <TextField
              select
              size="small"
              label="Sort By"
              value={circulationSort}
              onChange={(e) => setCirculationSort(e.target.value as any)}
              sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              SelectProps={{ native: true }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="value_high">Value: High → Low</option>
              <option value="value_low">Value: Low → High</option>
            </TextField>
            <Chip label={`${(() => {
              let filtered = tokens;
              if (circulationFilter === 'active') filtered = filtered.filter(t => !t.is_used);
              if (circulationFilter === 'used') filtered = filtered.filter(t => t.is_used);
              return filtered.length;
            })() } results`} size="small" sx={{ fontWeight: 800 }} />
          </Box>
          <TableContainer sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, bgcolor: 'background.paper' }}>TOKEN CODE</TableCell>
                  <TableCell sx={{ fontWeight: 900, bgcolor: 'background.paper' }}>VALUE</TableCell>
                  <TableCell sx={{ fontWeight: 900, bgcolor: 'background.paper' }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 900, bgcolor: 'background.paper' }}>DATE GENERATED</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, bgcolor: 'background.paper' }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><CircularProgress /></TableCell></TableRow>
                ) : (() => {
                  let filtered = tokens;
                  if (circulationFilter === 'active') filtered = filtered.filter(t => !t.is_used);
                  if (circulationFilter === 'used') filtered = filtered.filter(t => t.is_used);
                  if (circulationSort === 'oldest') filtered = [...filtered].reverse();
                  if (circulationSort === 'value_high') filtered = [...filtered].sort((a, b) => b.value - a.value);
                  if (circulationSort === 'value_low') filtered = [...filtered].sort((a, b) => a.value - b.value);
                  return filtered.length > 0 ? filtered.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', letterSpacing: 1.5 }}>{t.code}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>৳{t.value}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t.is_used ? `Redeemed by: ${t.profiles?.full_name || 'N/A'}` : 'Not yet used'}>
                        <Chip 
                          label={t.is_used ? 'Redeemed' : 'In Stock'} 
                          size="small" 
                          color={t.is_used ? 'default' : 'success'}
                          icon={t.is_used ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                          sx={{ fontWeight: 800, cursor: 'help' }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{new Date(t.created_at).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View QR Code">
                        <IconButton size="small" color="primary" onClick={() => setQrToken(t)}><QrCode size={16} /></IconButton>
                      </Tooltip>
                      <Tooltip title="Copy Code">
                        <IconButton size="small" onClick={() => { navigator.clipboard.writeText(t.code); setStatus({ text: 'Code copied!', type: 'success' }) }}><Copy size={16} /></IconButton>
                      </Tooltip>
                      {!t.is_used && <IconButton size="small" color="error" onClick={() => deleteToken(t.id)}><Trash2 size={16} /></IconButton>}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><Typography color="text.secondary">No tokens match the current filter.</Typography></TableCell></TableRow>
                );
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </CustomTabPanel>

      {/* Tab 3: Stats */}
      <CustomTabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {[
            { label: 'Total Vouchers', value: stats.total, sub: 'All-time generation', color: 'primary', icon: <Ticket size={24} />, bg: 'rgba(25, 118, 210, 0.04)' },
            { label: 'Active (Unused)', value: stats.active, sub: `৳${stats.active * generateValue} potential`, color: 'success', icon: <HistoryIcon size={24} />, bg: 'rgba(46, 125, 50, 0.04)' },
            { label: 'Total Redeemed', value: stats.used, sub: `${((stats.used/stats.total || 0) * 100).toFixed(1)}% conversion`, color: 'info', icon: <CheckCircle2 size={24} />, bg: 'rgba(2, 136, 209, 0.04)' },
            { label: 'Revenue Generated', value: `৳${stats.usedValue.toLocaleString()}`, sub: 'From redeemed vouchers', color: 'success', icon: <BarChart3 size={24} />, bg: 'rgba(56, 142, 60, 0.08)' },
          ].map((s, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Card variant="outlined" sx={{ 
                borderRadius: 4, 
                height: '100%', 
                bgcolor: s.bg,
                border: '1px solid',
                borderColor: (theme: any) => alpha(theme.palette[s.color].main, 0.1),
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: (theme: any) => alpha(theme.palette[s.color].main, 0.1), color: `${s.color}.main` }}>
                      {s.icon}
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6, display: 'block', mb: 0.5 }}>{s.label.toUpperCase()}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{s.value}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: `${s.color}.main` }}>{s.sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CustomTabPanel>

      {/* QR Code Dialog */}
      <Dialog 
        open={!!qrToken} 
        onClose={() => setQrToken(null)}
        PaperProps={{ sx: { borderRadius: 4, p: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', pb: 0 }}>
          Voucher QR Code
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 3 }}>
          {qrToken && (
            <>
              <Box sx={{ p: 3, bgcolor: 'white', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', mb: 3 }}>
                <QRCodeSVG value={qrToken.code} size={200} level="H" includeMargin={true} />
              </Box>
              <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 900, mb: 1 }}>{qrToken.code}</Typography>
              <Typography color="text.secondary" variant="body2">Denomination: ৳{qrToken.value}</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrToken(null)} fullWidth sx={{ fontWeight: 800 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </AdminPortalLayout>
  );
}
