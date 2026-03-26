'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatTimeAgo } from '@/utils/date';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, IconButton, List, ListItem, ListItemText,
  ListItemIcon, Divider, Badge, Popover, CircularProgress,
  Button, alpha, useTheme, Stack
} from '@mui/material';
import {
  Bell, Info, CheckCircle2, AlertTriangle, AlertCircle,
  ShieldAlert, Inbox, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  created_at: string;
}

export default function NotificationPanel() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewSinceOpen, setHasNewSinceOpen] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const fetchNotifications = useCallback(async () => {
    // No need to check session manually here, RLS will handle the data filtering
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, type, created_at')
      .order('created_at', { ascending: false })
      .limit(10); // Keep the panel lightweight

    if (!error && data) setNotifications(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('nav-notifs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev].slice(0, 10));

        // Show the badge if the panel isn't currently open
        if (!anchorEl) setHasNewSinceOpen(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, anchorEl]);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setHasNewSinceOpen(false); // Clear badge indicator on click
  };

  const handleClose = () => setAnchorEl(null);

  const getIcon = (type: string) => {
    const size = 18;
    const mapping = {
      success: { icon: <CheckCircle2 size={size} />, color: theme.palette.success.main },
      warning: { icon: <AlertTriangle size={size} />, color: theme.palette.warning.main },
      error: { icon: <AlertCircle size={size} />, color: theme.palette.error.main },
      system: { icon: <ShieldAlert size={size} />, color: theme.palette.primary.main },
      info: { icon: <Info size={size} />, color: theme.palette.info.main },
    };
    return mapping[type as keyof typeof mapping] || mapping.info;
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          transition: 'all 0.2s',
          bgcolor: open ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
          color: open ? 'primary.main' : 'inherit'
        }}
      >
        <Badge
          variant="dot"
          invisible={!hasNewSinceOpen}
          color="error"
          sx={{ '& .MuiBadge-badge': { width: 10, height: 10, borderRadius: '50%', border: `2px solid ${theme.palette.background.paper}` } }}
        >
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
              width: 360,
              maxHeight: 480,
              borderRadius: 3,
              mt: 1.5,
              boxShadow: theme.shadows[10],
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }
          }
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Notifications</Typography>
          {notifications.length > 0 && (
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled' }}>
              Latest updates
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Content */}
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
          ) : notifications.length > 0 ? (
            <List disablePadding>
              {notifications.map((n) => {
                const config = getIcon(n.type);
                return (
                  <ListItem
                    key={n.id}
                    sx={{
                      py: 2, px: 2.5,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.4) },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 42 }}>
                      <Box sx={{
                        p: 0.8, borderRadius: 1.5,
                        bgcolor: alpha(config.color, 0.1),
                        color: config.color,
                        display: 'flex'
                      }}>
                        {config.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.3 }}>
                          {n.title}
                        </Typography>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                            {n.message}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                            {formatTimeAgo(n.created_at)}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Inbox size={40} strokeWidth={1} style={{ color: theme.palette.divider, marginBottom: 8 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                No notifications yet
              </Typography>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Footer */}
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            endIcon={<ExternalLink size={14} />}
            onClick={() => { handleClose(); router.push('/dashboard/notifications'); }}
            sx={{
              py: 1,
              fontWeight: 700,
              borderRadius: 2,
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) }
            }}
          >
            View all activity
          </Button>
        </Box>
      </Popover>
    </>
  );
}