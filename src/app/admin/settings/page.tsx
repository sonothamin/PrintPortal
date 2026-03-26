'use client';

import React, { useEffect, useState } from 'react';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { supabase } from '@/lib/supabase';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Paper
} from '@mui/material';
import {
  DollarSign, 
  TrendingUp, 
  Save, 
  RefreshCw, 
  Percent
} from 'lucide-react';
import { isValidPrice, sanitizePrice, ERROR_MESSAGES } from '@/lib/validation';

export default function EconomySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ text: '', type: 'info' as 'info' | 'success' | 'error' });

  const [pricing, setPricing] = useState({
    mono_price_per_page: 0,
    color_price_per_page: 0,
    mono_cost_per_page: 0,
    color_cost_per_page: 0
  });

  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'print_pricing')
      .single();

    if (data) {
      setPricing(data.value);
    } else if (error) {
      console.error('Error fetching settings:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setStatus({ text: '', type: 'info' });

    try {
      // 1. Validation & Sanitization
      const errors: Record<string, string> = {};
      const cleanPricing: any = {};
      
      Object.entries(pricing).forEach(([key, val]) => {
        if (!isValidPrice(val)) {
          errors[key] = ERROR_MESSAGES.INVALID_PRICE;
        } else {
          cleanPricing[key] = sanitizePrice(val);
        }
      });

      if (Object.keys(errors).length > 0) {
        setPriceErrors(errors);
        return;
      }
      setPriceErrors({});

      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'update-settings', pricing: cleanPricing }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to update settings');
      }

      setStatus({ text: 'Settings updated successfully!', type: 'success' });
    } catch (err: any) {
      setStatus({ text: err.message || 'Error saving settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const calculateMargin = (price: number, cost: number) => {
    if (price === 0) return 0;
    return (((price - cost) / price) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <AdminPortalLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </AdminPortalLayout>
    );
  }

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, mb: 1 }}>
          Economy Settings
        </Typography>
        <Typography color="text.secondary">
          Configure service pricing, operation costs, and monitor profit margins.
        </Typography>
      </Box>

      {status.text && (
        <Alert severity={status.type} sx={{ mb: 4, borderRadius: 3 }}>{status.text}</Alert>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                <DollarSign size={24} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Print Pricing & Costs</Typography>
              </Box>

              <Grid container spacing={4}>
                {/* Mono Section */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.primary' }} />
                    MONOCHROME (B&W)
                  </Typography>
                  <TextField
                    fullWidth
                    label="Price per Page"
                    type="number"
                    value={pricing.mono_price_per_page}
                    onChange={(e) => {
                      setPricing({ ...pricing, mono_price_per_page: Number(e.target.value) });
                      setPriceErrors({ ...priceErrors, mono_price_per_page: '' });
                    }}
                    error={Boolean(priceErrors.mono_price_per_page)}
                    helperText={priceErrors.mono_price_per_page}
                    sx={{ mb: 3 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
                  />
                  <TextField
                    fullWidth
                    label="Operation Cost per Page"
                    type="number"
                    value={pricing.mono_cost_per_page}
                    onChange={(e) => {
                      setPricing({ ...pricing, mono_cost_per_page: Number(e.target.value) });
                      setPriceErrors({ ...priceErrors, mono_cost_per_page: '' });
                    }}
                    error={Boolean(priceErrors.mono_cost_per_page)}
                    helperText={priceErrors.mono_cost_per_page}
                    sx={{ mb: 3 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
                  />
                </Grid>

                {/* Color Section */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                    FULL COLOR
                  </Typography>
                  <TextField
                    fullWidth
                    label="Price per Page"
                    type="number"
                    value={pricing.color_price_per_page}
                    onChange={(e) => {
                      setPricing({ ...pricing, color_price_per_page: Number(e.target.value) });
                      setPriceErrors({ ...priceErrors, color_price_per_page: '' });
                    }}
                    error={Boolean(priceErrors.color_price_per_page)}
                    helperText={priceErrors.color_price_per_page}
                    sx={{ mb: 3 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
                  />
                  <TextField
                    fullWidth
                    label="Operation Cost per Page"
                    type="number"
                    value={pricing.color_cost_per_page}
                    onChange={(e) => {
                      setPricing({ ...pricing, color_cost_per_page: Number(e.target.value) });
                      setPriceErrors({ ...priceErrors, color_cost_per_page: '' });
                    }}
                    error={Boolean(priceErrors.color_cost_per_page)}
                    helperText={priceErrors.color_cost_per_page}
                    sx={{ mb: 3 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshCw size={18} />}
                  onClick={fetchSettings}
                  sx={{ borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
                >
                  Reset
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ 
                    bgcolor: 'text.primary', 
                    color: 'background.default', 
                    borderRadius: 2, 
                    px: 4, 
                    width: { xs: '100%', sm: 'auto' },
                    '&:hover': { bgcolor: 'text.secondary' } 
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                <TrendingUp size={24} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Projected Margins</Typography>
              </Box>

              <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.default' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.6 }}>BNW MARGIN</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>{calculateMargin(pricing.mono_price_per_page, pricing.mono_cost_per_page)}%</Typography>
                  <Typography variant="body2" color="text.secondary">per page</Typography>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'background.default' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.6 }}>COLOR MARGIN</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>{calculateMargin(pricing.color_price_per_page, pricing.color_cost_per_page)}%</Typography>
                  <Typography variant="body2" color="text.secondary">per page</Typography>
                </Box>
              </Paper>

              <Box sx={{ mt: 4, p: 2, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'grey.50' }}>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
                  <Percent size={14} /> Margin = (Price - Cost) / Price
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminPortalLayout>
  );
}
