'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Button, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Chip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  MenuItem,
  Autocomplete,
  Avatar,
  CircularProgress,
  alpha,
  useTheme
} from '@mui/material';
import { 
  Bell, 
  Send, 
  Trash2, 
  User, 
  Users, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  created_at: string;
  user_id: string | null;
  profiles?: { full_name: string; email: string };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

export default function NotificationManagement() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Form State
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<Notification['type']>('info');

  const theme = useTheme();

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Fetch notifications with profile info
    const { data: notifs, error: notifError } = await supabase
      .from('notifications')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (!notifError) setNotifications(notifs || []);

    // Fetch users for targeting
    const { data: userList, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name');
    
    // Note: In real app, we'd fetch emails from auth.users or store in profiles
    if (!userError) setUsers(userList.map(u => ({ ...u, email: '' })) as UserProfile[]);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!title || !message) return;
    setSending(true);

    const { error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        type,
        user_id: isBroadcast ? null : targetUser?.id
      });

    if (!error) {
      setOpen(false);
      setTitle('');
      setMessage('');
      setTargetUser(null);
      fetchData();
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'error': return <AlertCircle size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1, mb: 1 }}>
            Alert Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            Broadcast system updates or send direct messages to students.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={() => setOpen(true)}
          sx={{ borderRadius: 3, px: 3, py: 1.2, fontWeight: 700, bgcolor: 'text.primary', color: 'background.default' }}
        >
          New Notification
        </Button>
      </Box>

      {/* Stats Summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
        {[
          { label: 'Total Alerts', value: notifications.length, icon: <Bell size={20} />, color: 'primary' },
          { label: 'Broadcasts', value: notifications.filter(n => !n.user_id).length, icon: <Users size={20} />, color: 'success' },
          { label: 'Targeted', value: notifications.filter(n => n.user_id).length, icon: <User size={20} />, color: 'info' },
        ].map((stat, i) => (
          <Card key={i} sx={{ borderRadius: 4, bgcolor: alpha(theme.palette.text.primary, 0.02), border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.05), color: 'text.primary' }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>{stat.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{stat.value}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <TableContainer component={Card} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              <TableCell sx={{ fontWeight: 800 }}>Notification</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Target</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Created At</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : notifications.length > 0 ? (
              notifications.map((n) => (
                <TableRow key={n.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{n.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{n.message}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {n.user_id ? (
                      <Chip 
                        size="small" 
                        label={n.profiles?.full_name || 'Individual Student'} 
                        icon={<User size={12} />} 
                        sx={{ fontWeight: 700 }} 
                      />
                    ) : (
                      <Chip 
                        size="small" 
                        label="All Students" 
                        variant="outlined" 
                        icon={<Users size={12} />} 
                        sx={{ fontWeight: 700 }} 
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      size="small" 
                      label={n.type.toUpperCase()} 
                      color={n.type === 'info' ? 'default' : n.type as any}
                      icon={getIcon(n.type)}
                      sx={{ fontWeight: 800, fontSize: '0.65rem' }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => handleDelete(n.id)}>
                      <Trash2 size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Typography color="text.disabled" sx={{ fontWeight: 600 }}>No notifications sent yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Creation Dialog */}
      <Dialog 
        open={open} 
        onClose={() => !sending && setOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem' }}>Send New Alert</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant={isBroadcast ? "contained" : "outlined"} 
                onClick={() => setIsBroadcast(true)} 
                fullWidth sx={{ borderRadius: 2, fontWeight: 700 }}
                startIcon={<Users size={18} />}
              >
                Broadcast
              </Button>
              <Button 
                variant={!isBroadcast ? "contained" : "outlined"} 
                onClick={() => setIsBroadcast(false)} 
                fullWidth sx={{ borderRadius: 2, fontWeight: 700 }}
                startIcon={<User size={18} />}
              >
                Targeted
              </Button>
            </Box>

            {!isBroadcast && (
              <Autocomplete
                options={users}
                getOptionLabel={(option) => option.full_name}
                value={targetUser}
                onChange={(_, newValue) => setTargetUser(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Student" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', gap: 2, p: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{option.full_name[0]}</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.full_name}</Typography>
                  </Box>
                )}
              />
            )}

            <TextField 
              label="Title" 
              fullWidth 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., System Maintenance"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />

            <TextField 
              label="Message" 
              fullWidth 
              multiline 
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your alert message here..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />

            <TextField
              select
              label="Priority Level"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            >
              <MenuItem value="info">Information (Blue)</MenuItem>
              <MenuItem value="success">Success (Green)</MenuItem>
              <MenuItem value="warning">Warning (Yellow)</MenuItem>
              <MenuItem value="error">Critical (Red)</MenuItem>
              <MenuItem value="system">System (Purple)</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreate}
            disabled={sending || !title || !message || (!isBroadcast && !targetUser)}
            sx={{ borderRadius: 3, px: 4, py: 1.2, fontWeight: 800, bgcolor: 'text.primary', color: 'background.default' }}
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <Send size={18} />}
          >
            {sending ? 'Sending...' : 'Send Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPortalLayout>
  );
}
