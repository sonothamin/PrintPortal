'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  Button, 
  IconButton, 
  Chip, 
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  alpha,
  useTheme
} from '@mui/material';
import { 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  AlertCircle,
  Inbox,
  Check,
  RotateCw
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

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setNotifications(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('user-notifications-history')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications' 
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const getBgColor = (type: string, isRead: boolean) => {
    if (isRead) return 'transparent';
    switch (type) {
      case 'error': return alpha(theme.palette.error.main, 0.05);
      case 'warning': return alpha(theme.palette.warning.main, 0.05);
      case 'success': return alpha(theme.palette.success.main, 0.05);
      default: return alpha(theme.palette.primary.main, 0.03);
    }
  };

  const getIcon = (type: string, isRead: boolean) => {
    const size = 20;
    switch (type) {
      case 'success': return <CheckCircle2 size={size} color={isRead ? undefined : theme.palette.success.main} />;
      case 'warning': return <AlertTriangle size={size} color={isRead ? undefined : theme.palette.warning.main} />;
      case 'error': return <AlertCircle size={size} color={isRead ? undefined : theme.palette.error.main} />;
      default: return <Info size={size} color={isRead ? undefined : theme.palette.info.main} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1, mb: 1 }}>
            Notifications
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            {unreadCount > 0 
              ? `You have ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}.` 
              : 'Your inbox is clear.'}
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              variant="outlined"
              startIcon={
                <RotateCw 
                  size={16} 
                  style={{ 
                    animation: loading ? 'spin 1s linear infinite' : 'none' 
                  }} 
                />
              } 
              onClick={fetchNotifications}
              disabled={loading}
              sx={{ 
                fontWeight: 700, 
                borderRadius: 2, 
                borderColor: 'divider', 
                color: 'text.primary',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            >
              Refresh
            </Button>
            <Button 
              size="small" 
              startIcon={<Check size={16} />} 
              onClick={markAllAsRead}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Mark all as read
            </Button>
          </Box>
        )}
        {!loading && unreadCount === 0 && (
           <Button 
              size="small" 
              variant="outlined"
              startIcon={<RotateCw size={16} />} 
              onClick={fetchNotifications}
              sx={{ fontWeight: 700, borderRadius: 2, borderColor: 'divider', color: 'text.primary' }}
            >
              Refresh
            </Button>
        )}
      </Box>

      <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : notifications.length > 0 ? (
          <List disablePadding>
            {notifications.map((n, i) => (
              <React.Fragment key={n.id}>
                <ListItem 
                  sx={{ 
                    py: 2.5, 
                    px: 3,
                    bgcolor: getBgColor(n.type, n.is_read),
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: n.is_read ? alpha(theme.palette.text.primary, 0.02) : alpha(getBgColor(n.type, false), 1.5)
                    }
                  }}
                  secondaryAction={
                    !n.is_read && (
                      <IconButton size="small" onClick={() => markAsRead(n.id)} title="Mark as read">
                        <Check size={18} />
                      </IconButton>
                    )
                  }
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      bgcolor: n.is_read ? alpha(theme.palette.text.disabled, 0.1) : alpha(theme.palette.text.primary, 0.05),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getIcon(n.type, n.is_read)}
                    </Box>
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: n.is_read ? 600 : 800 }}>
                          {n.title}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={n.type.toUpperCase()} 
                          color={n.type === 'info' ? 'default' : n.type as any}
                          sx={{ 
                            fontWeight: 900, 
                            fontSize: '0.6rem', 
                            height: 18,
                            opacity: n.is_read ? 0.6 : 1
                          }} 
                        />
                        {!n.is_read && (
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.5 }}>
                          {n.message}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', mt: 0.5 }}>
                          {new Date(n.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {i < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 10, textAlign: 'center' }}>
            <Box sx={{ mb: 2, color: 'text.disabled' }}>
              <Inbox size={48} strokeWidth={1.5} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No Notifications</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500 }}>
              You're all caught up! New alerts will appear here.
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}
