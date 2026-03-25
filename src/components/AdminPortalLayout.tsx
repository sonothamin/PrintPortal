'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Container,
  Chip,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Printer, 
  Users, 
  Ticket, 
  Settings, 
  LogOut, 
  Menu as MenuIcon,
  ChevronLeft,
  Bell,
  Search,
  Activity,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  AlertTriangle,
  Folder
} from 'lucide-react';
import { useThemeMode } from '@/theme/ThemeContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const drawerWidth = 260;

const adminMenuItems = [
  { text: 'Overview', icon: <LayoutDashboard size={20} />, path: '/admin' },
  { text: 'Global Queue', icon: <Printer size={20} />, path: '/admin/queue' },
  { text: 'Users', icon: <Users size={20} />, path: '/admin/users' },
  { text: 'Tokens', icon: <Ticket size={20} />, path: '/admin/tokens' },
  { text: 'Economy', icon: <Settings size={20} />, path: '/admin/settings' },
];

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [adminInitial, setAdminInitial] = useState('A');
  const [adminName, setAdminName] = useState('Admin');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const { mode, toggleTheme } = useThemeMode();
  const pathname = usePathname();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, avatar_url, full_name, status') // Added 'status' to selection
        .eq('id', session.user.id)
        .single();

      if (profile?.status === 'suspended') { // Check for suspended status
        router.push('/suspended');
        return;
      }

      if (error || profile?.role !== 'admin') {
        console.warn('Admin access denied for non-admin role (403).');
        setForbidden(true);
        setLoading(false);
        // Automatically redirect to homepage after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        const name = profile?.full_name || session.user.email || 'Admin';
        setAdminName(name);
        setAdminInitial(name[0].toUpperCase());
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = async () => {
    handleClose();
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) return null; // Wait until verification is complete

  if (forbidden) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2, bgcolor: 'background.default' }}>
        <AlertTriangle size={64} color={theme.palette.error.main} />
        <Typography variant="h3" color="error" fontWeight={800}>403 FORBIDDEN</Typography>
        <Typography variant="h6" color="text.secondary">You do not have permission to view the administrative portal.</Typography>
        <Typography variant="body2" color="text.disabled">Redirecting to homepage...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : 72,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 72,
            bgcolor: mode === 'dark' ? '#000000' : '#ffffff',
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', minHeight: 64 }}>
          {open && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ bgcolor: 'text.primary', color: 'background.default', p: 0.5, borderRadius: 1.5 }}>
                <ShieldCheck size={20} strokeWidth={2.5} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -1, fontSize: '1.2rem' }}>
                Admin Portal
              </Typography>
            </Box>
          )}
          <IconButton onClick={() => setOpen(!open)} size="small">
            {open ? <ChevronLeft size={18} /> : <MenuIcon size={18} />}
          </IconButton>
        </Box>
        
        <Divider />
        
        <List sx={{ px: 1.5, py: 2 }}>
          {adminMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Link href={item.path} passHref style={{ width: '100%' }}>
                <ListItemButton 
                  selected={pathname === item.path}
                  sx={{ 
                    borderRadius: 2,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2,
                    py: 1.2,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.text.primary, 0.08),
                      color: 'text.primary',
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.text.primary, 0.04),
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  {open && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 700, fontSize: '0.875rem' }} />}
                </ListItemButton>
              </Link>
            </ListItem>
          ))}
        </List>
        
        <Box sx={{ mt: 'auto', p: 2 }}>
          {open && (
            <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 3, p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Activity size={14} color={theme.palette.success.main} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main' }}>SYSTEM STATUS</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>All Services Online</Typography>
            </Box>
          )}
          <Divider sx={{ mb: 1 }} />
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', color: 'inherit' }}><LogOut size={20} /></ListItemIcon>
            {open && <ListItemText primary="Sign Out" primaryTypographyProps={{ fontWeight: 700 }} />}
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: alpha(theme.palette.background.default, 0.8), backdropFilter: 'blur(8px)', borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Box sx={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <Box 
                  component="input"
                  placeholder="Universal search (Cmd + K)"
                  sx={{ 
                    width: '100%',
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    border: 'none',
                    borderRadius: 2,
                    py: 1,
                    pl: 5,
                    pr: 2,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    '&:focus': { outline: 'none', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                  }}
                />
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={toggleTheme} size="small">
                {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </IconButton>
              <IconButton size="small"><Bell size={20} /></IconButton>
              <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: 'center' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={handleMenu}>
                <Avatar 
                  src={avatarUrl || undefined}
                  sx={{ width: 32, height: 32, bgcolor: 'text.primary', color: 'background.default', fontWeight: 800, fontSize: '0.8rem' }}
                >
                  {adminInitial}
                </Avatar>
                {open && (
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1 }}>{adminName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Administrator</Typography>
                  </Box>
                )}
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{ sx: { mt: 1, borderRadius: 2, minWidth: 150, boxShadow: theme.shadows[10] } }}
              >
                <MenuItem onClick={() => router.push('/dashboard')}>
                  <ListItemIcon><LayoutDashboard size={18} /></ListItemIcon>
                  User Portal
                </MenuItem>

                <Divider />
                <MenuItem onClick={handleLogout} sx={{ py: 1.2, borderRadius: 1.5, mx: 1, my: 0.5, color: 'error.main' }}>
                  <ListItemIcon sx={{ color: 'inherit' }}><LogOut size={18} /></ListItemIcon>
                  <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }} />
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ p: { xs: 2, sm: 4, md: 6 }, flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="xl" disableGutters>
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
