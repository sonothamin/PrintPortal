'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Container,
  Chip
} from '@mui/material';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Printer,
  Ticket,
  Menu as MenuIcon,
  ChevronLeft,
  Activity,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { useThemeMode } from '@/theme/ThemeContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

const drawerWidth = 280;

const adminMenuItems = [
  { text: 'Management Overview', icon: <LayoutDashboard size={20} />, path: '/management' },
  { text: 'Print Queue', icon: <Printer size={20} />, path: '/management/queue' },
  { text: 'User Management', icon: <Users size={20} />, path: '/management/users' },
  { text: 'Token Generation', icon: <Ticket size={20} />, path: '/management/tokens' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [adminInitial, setAdminInitial] = useState('A');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { mode, toggleTheme } = useThemeMode();
  const pathname = usePathname();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      // Check if user is admin in profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .single();

      if (profile?.status === 'suspended') {
        router.push('/suspended');
        return;
      }

      if (error || profile?.role !== 'admin') {
        router.push('/dashboard');
      } else {
        const email = session.user.email;
        if (email) setAdminInitial(email[0].toUpperCase());
        
        // Fetch avatar
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single();
        
        if (profile) setAvatarUrl(profile.avatar_url);
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw', 
        justifyContent: 'center', 
        alignItems: 'center',
        bgcolor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <ShieldCheck size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Verifying Credentials...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : 72,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 72,
            overflowX: 'hidden',
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: (theme) => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', p: 3, justifyContent: open ? 'space-between' : 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: 'text.primary', color: 'background.default', p: 0.5, borderRadius: 1.5 }}>
              <ShieldCheck size={24} />
            </Box>
            {open && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
                  PrintPortal Admin
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.5 }}>
                  SYSTEM PORTAL
                </Typography>
              </Box>
            )}
          </Box>
          <IconButton onClick={toggleDrawer}>
            {open ? <ChevronLeft size={20} /> : <MenuIcon size={20} />}
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ px: 2, py: 3 }}>
          {adminMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <Link href={item.path} passHref style={{ width: '100%' }}>
                <ListItemButton 
                  selected={pathname === item.path}
                  sx={{ 
                    borderRadius: 2.5,
                    py: 1.5,
                    bgcolor: (theme) => pathname === item.path 
                      ? theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' 
                      : 'transparent',
                    color: 'text.primary',
                    '&.Mui-selected': {
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      color: 'text.primary',
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                      '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }
                    },
                    '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'divider' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  {open && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }} />}
                </ListItemButton>
              </Link>
            </ListItem>
          ))}
        </List>
        
        <Box sx={{ mt: 'auto', p: 3, display: open ? 'block' : 'none' }}>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Activity size={16} color="#4caf50" />
              <Typography variant="caption" sx={{ fontWeight: 800 }}>Kiosk Fleet Status</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>98% Operational</Typography>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ px: 4 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: 'background.paper', 
                  border: '1px solid',
                  borderColor: 'divider',
                  px: 2, 
                  py: 1, 
                  borderRadius: 2, 
                  maxWidth: 400,
                  gap: 1.5
                }}
              >
                <Search size={18} color="#6c757d" />
                <Typography variant="body2" color="text.secondary">Search users, job IDs, or kiosks...</Typography>
              </Box>
            </Box>
            <IconButton onClick={toggleTheme} size="small" sx={{ mr: 1 }}>
              {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip label="Admin Instance #1" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
              <IconButton onClick={handleMenu}>
                <Avatar 
                  src={avatarUrl || undefined}
                  sx={{ width: 36, height: 36, bgcolor: 'text.primary', color: 'background.default', fontWeight: 700 }}
                >
                  {adminInitial}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ py: 1.2, borderRadius: 1.5, mx: 1, my: 0.5, color: 'error.main' }}>
                  <ListItemIcon sx={{ color: 'inherit' }}><LogOut size={18} /></ListItemIcon>
                  <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }} />
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
        
        <Box component="main" sx={{ p: 5, flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" disableGutters>
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
