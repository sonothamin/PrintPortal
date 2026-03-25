'use client';

import React, { useEffect, useState } from 'react';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Grid, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  LinearProgress, 
  Chip,
  Button,
  alpha
} from '@mui/material';
import { 
  Printer, 
  Activity, 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  Monitor,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalUsers: 0,
    revenue: 0,
    kiosksOnline: 0
  });
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [jobsRes, usersRes, txRes, kiosksRes] = await Promise.all([
        supabase.from('print_jobs').select('id', { count: 'exact' }).in('status', ['pending', 'processing']),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('transactions').select('amount').eq('type', 'recharge'),
        supabase.from('kiosks').select('*')
      ]);

      const rev = txRes.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const onlineCount = kiosksRes.data?.filter(k => k.status === 'online').length || 0;

      setStats({
        activeJobs: jobsRes.count || 0,
        totalUsers: usersRes.count || 0,
        revenue: rev,
        kiosksOnline: onlineCount
      });
      setKiosks(kiosksRes.data || []);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, mb: 1 }}>
          System Overview
        </Typography>
        <Typography color="text.secondary" variant="body1">
          Monitor your fleet performance and service health in real-time.
        </Typography>
      </Box>

      {/* Metrics Grid */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {[
            { label: 'Active Queue', value: stats.activeJobs, icon: <Printer size={20} />, color: 'primary.main', trend: `${stats.activeJobs} jobs in progress` },
            { label: 'Total Users', value: stats.totalUsers, icon: <Users size={20} />, color: 'info.main', trend: `${stats.totalUsers} registered` },
            { label: 'Total Revenue', value: `৳${stats.revenue.toLocaleString()}`, icon: <TrendingUp size={20} />, color: 'success.main', trend: 'From token recharges' },
            { label: 'Kiosks Online', value: `${stats.kiosksOnline}/${kiosks.length}`, icon: <Activity size={20} />, color: 'warning.main', trend: kiosks.length > 0 ? `${Math.round((stats.kiosksOnline / kiosks.length) * 100)}% online` : 'No kiosks' },
          ].map((m, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ color: m.color, bgcolor: (theme: any) => alpha(theme.palette[m.color.split('.')[0]].main, 0.1), p: 1, borderRadius: 2 }}>
                    {m.icon}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>{m.label.toUpperCase()}</Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{m.value}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: m.color }}>{m.trend}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Monitor size={24} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Kiosk Fleet Monitor</Typography>
            </Box>
            <Button size="small" startIcon={<RefreshCw size={16} />}>Refresh</Button>
          </Box>
          
          <Grid container spacing={2}>
            {loading ? (
              <Grid size={{ xs: 12 }}><Typography>Loading kiosks...</Typography></Grid>
            ) : kiosks.length > 0 ? kiosks.map((k) => (
              <Grid size={{ xs: 12, sm: 6 }} key={k.id}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{k.name}</Typography>
                        <Typography variant="caption" color="text.secondary">ID: {k.id.slice(0, 8)}</Typography>
                      </Box>
                      <Chip 
                        label={k.status} 
                        size="small" 
                        color={k.status === 'online' ? 'success' : k.status === 'warning' ? 'warning' : 'error'}
                        sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} 
                      />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>Paper Level</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{k.paper_level || 0}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={k.paper_level || 0} color={(k.paper_level || 0) < 20 ? 'error' : 'primary'} sx={{ height: 6, borderRadius: 3 }} />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>Ink Status</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{k.ink_level || 0}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={k.ink_level || 0} color={(k.ink_level || 0) < 10 ? 'error' : 'secondary'} sx={{ height: 6, borderRadius: 3 }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )) : (
              <Grid size={{ xs: 12 }}><Typography>No kiosks found.</Typography></Grid>
            )}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <AlertTriangle size={24} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Active Alerts</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(() => {
              // Generate real alerts from kiosk data
              const alerts: { type: string; msg: string; time: string }[] = [];
              kiosks.forEach(k => {
                if ((k.paper_level || 0) < 20) {
                  alerts.push({ type: 'error', msg: `Low Paper: ${k.name} (${k.paper_level}%)`, time: 'Live' });
                }
                if ((k.ink_level || 0) < 15) {
                  alerts.push({ type: 'error', msg: `Low Ink: ${k.name} (${k.ink_level}%)`, time: 'Live' });
                }
                if (k.status === 'warning') {
                  alerts.push({ type: 'warning', msg: `Warning: ${k.name}`, time: 'Live' });
                }
                if (k.status === 'offline') {
                  alerts.push({ type: 'error', msg: `Offline: ${k.name}`, time: 'Live' });
                }
              });
              if (alerts.length === 0) {
                alerts.push({ type: 'info', msg: 'All systems operational. No active alerts.', time: 'Now' });
              }
              return alerts.map((a, i) => (
                <Box key={i} sx={{ 
                  p: 2, 
                  borderRadius: 3, 
                  bgcolor: (theme: any) => alpha(theme.palette[a.type as 'error' | 'warning' | 'info'].main, 0.1),
                  border: '1px solid',
                  borderColor: (theme: any) => alpha(theme.palette[a.type as 'error' | 'warning' | 'info'].main, 0.2),
                  display: 'flex',
                  gap: 2
                }}>
                  <Box sx={{ color: `${a.type}.main` }}><AlertTriangle size={18} /></Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.msg}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.time}</Typography>
                  </Box>
                </Box>
              ));
            })()}
          </Box>
        </Grid>
      </Grid>
    </AdminPortalLayout>
  );
}
