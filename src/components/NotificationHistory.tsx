'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatTimeAgo } from '@/utils/date';
import { 
  Typography, Box, Card, Button, Divider, List, ListItem, 
  ListItemText, ListItemIcon, CircularProgress, alpha, useTheme,
  Skeleton, Stack, Fade, Tooltip, IconButton, Chip 
} from '@mui/material';
import {
  CheckCircle2, Info, AlertTriangle, AlertCircle,
  Inbox, RotateCw, BellOff, ArrowDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  created_at: string;
}

const PAGE_SIZE = 10;

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const theme = useTheme();

  // Use a ref for the latest count to prevent stale closures in realtime
  const offsetRef = useRef(0);

  const fetchNotifications = useCallback(async (isInitial = true) => {
    if (isInitial) {
      setLoading(true);
      offsetRef.current = 0;
    } else {
      setLoadingMore(true);
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, type, created_at')
      .order('created_at', { ascending: false })
      .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);

    if (!error && data) {
      setNotifications(prev => isInitial ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current += PAGE_SIZE;
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime: Only listen for NEW inserts to keep the feed "live"
    const channel = supabase
      .channel('prod-activity-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        offsetRef.current += 1; // Adjust offset so "Load More" doesn't skip items
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications]);

  const getIcon = (type: string) => {
    const iconProps = { size: 20 };
    const mapping = {
      success: { icon: <CheckCircle2 {...iconProps} />, color: theme.palette.success.main },
      warning: { icon: <AlertTriangle {...iconProps} />, color: theme.palette.warning.main },
      error: { icon: <AlertCircle {...iconProps} />, color: theme.palette.error.main },
      system: { icon: <BellOff {...iconProps} />, color: theme.palette.secondary.main },
      info: { icon: <Info {...iconProps} />, color: theme.palette.info.main },
    };
    return mapping[type as keyof typeof mapping] || mapping.info;
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', pb: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5 }}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            Stay updated with your printing activity and system status.
          </Typography>
        </Box>
        <Tooltip title="Refresh Feed">
          <IconButton onClick={() => fetchNotifications(true)} disabled={loading}>
            <RotateCw size={20} className={loading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      <Card sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        overflow: 'hidden'
      }}>
        {loading ? (
          <Stack divider={<Divider />}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ p: 3, display: 'flex', gap: 2 }}>
                <Skeleton variant="rounded" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="30%" height={24} sx={{ mb: 1 }} />
                  <Skeleton width="90%" height={20} />
                </Box>
              </Box>
            ))}
          </Stack>
        ) : notifications.length > 0 ? (
          <>
            <List disablePadding>
              {notifications.map((n, i) => {
                const config = getIcon(n.type);
                return (
                  <Fade in key={n.id} timeout={400}>
                    <Box>
                      <ListItem sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
                        <ListItemIcon sx={{ minWidth: 56 }}>
                          <Box sx={{
                            p: 1.2, borderRadius: '12px',
                            bgcolor: alpha(config.color, 0.1),
                            color: config.color,
                            display: 'flex'
                          }}>
                            {config.icon}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                {n.title}
                              </Typography>
                              <Chip
                                label={n.type}
                                size="small"
                                sx={{
                                  height: 20, fontSize: '0.65rem', fontWeight: 900,
                                  textTransform: 'uppercase', bgcolor: alpha(config.color, 0.1),
                                  color: config.color, border: `1px solid ${alpha(config.color, 0.2)}`
                                }}
                              />
                            </Stack>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.primary" sx={{ opacity: 0.8, mb: 1, lineHeight: 1.6 }}>
                                {n.message}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                                {formatTimeAgo(n.created_at)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {i < notifications.length - 1 && <Divider />}
                    </Box>
                  </Fade>
                );
              })}
            </List>

            {hasMore && (
              <Box sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                <Button
                  fullWidth
                  variant="text"
                  onClick={() => fetchNotifications(false)}
                  disabled={loadingMore}
                  startIcon={loadingMore ? <CircularProgress size={16} /> : <ArrowDown size={16} />}
                  sx={{ fontWeight: 700, color: 'text.secondary' }}
                >
                  {loadingMore ? 'Loading...' : 'Load Older Notifications'}
                </Button>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ p: 12, textAlign: 'center' }}>
            <Inbox size={64} strokeWidth={1} style={{ color: theme.palette.divider, marginBottom: 16 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Quiet in here...</Typography>
            <Typography variant="body2" color="text.secondary">
              When we have updates for you, they'll show up here.
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}