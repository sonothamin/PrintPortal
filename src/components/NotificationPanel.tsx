'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider,
  Badge,
  Popover,
  CircularProgress,
  Button,
  alpha,
  useTheme
} from '@mui/material';
import { 
  Bell, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  is_read: boolean;
  created_at: string;
}

export default function NotificationPanel() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const theme = useTheme();

  const fetchNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${session.user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Setup Realtime Subscription
    const channel = supabase
      .channel('notification-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Only add if it's for this user or a broadcast
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && (!newNotif.id || newNotif.id === session.user.id || (payload.new as any).user_id === null)) {
               setNotifications(prev => [newNotif, ...prev].slice(0, 20));
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const open = Boolean(anchorEl);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color={theme.palette.success.main} />;
      case 'warning': return <AlertTriangle size={18} color={theme.palette.warning.main} />;
      case 'error': return <AlertCircle size={18} color={theme.palette.error.main} />;
      case 'system': return <ShieldAlert size={18} color={theme.palette.primary.main} />;
      default: return <Info size={18} color={theme.palette.info.main} />;
    }
  };

  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleOpen} 
        sx={{ 
          bgcolor: open ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : 'transparent' 
        }}
      >
        <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}>
          <Bell size={22} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              maxHeight: 500,
              borderRadius: 4,
              mt: 1.5,
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              overflow: 'hidden'
            }
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" variant="text" onClick={markAllAsRead} sx={{ fontWeight: 700, textTransform: 'none' }}>
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider />

        <Box sx={{ overflow: 'auto', maxHeight: 380 }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
          ) : notifications.length > 0 ? (
            <List disablePadding>
              {notifications.map((n) => (
                <ListItem 
                  key={n.id} 
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  sx={{ 
                    cursor: 'pointer',
                    py: 2,
                    px: 3,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    bgcolor: n.is_read ? 'transparent' : (theme) => alpha(theme.palette.primary.main, 0.02),
                    '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) },
                    transition: 'all 0.2s'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getIcon(n.type)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={n.title}
                    secondary={
                      <Box component="span">
                        <Typography variant="body2" sx={{ display: 'block', mb: 0.5 }}>{n.message}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                    primaryTypographyProps={{ 
                      fontWeight: n.is_read ? 700 : 900, 
                      fontSize: '0.9rem',
                      color: n.is_read ? 'text.primary' : 'primary.main'
                    }}
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  {!n.is_read && (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', ml: 1 }} />
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 6, textAlign: 'center', opacity: 0.5 }}>
              <Bell size={48} strokeWidth={1} style={{ marginBottom: 16 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>No notifications yet</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>We'll alert you here when something important happens.</Typography>
            </Box>
          )}
        </Box>

        <Divider />
        <Box sx={{ p: 1.5, textAlign: 'center' }}>
          <Button 
            fullWidth 
            size="small" 
            color="inherit" 
            onClick={() => { handleClose(); router.push('/dashboard/notifications'); }}
            sx={{ fontWeight: 800, opacity: 0.6 }}
          >
            View Full History
          </Button>
        </Box>
      </Popover>
    </>
  );
}
