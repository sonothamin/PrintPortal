'use client';

import React, { useState } from 'react';
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
  useTheme,
  useMediaQuery,
  Container
} from '@mui/material';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Wallet, 
  LogOut, 
  Menu as MenuIcon,
  ChevronLeft,
  Moon,
  History as HistoryIcon,
  ShieldCheck,
  Sun,
  Bell,
  User
} from 'lucide-react';
import { useThemeMode } from '@/theme/ThemeContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import NotificationPanel from './NotificationPanel';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { text: 'Upload Documents', icon: <UploadCloud size={20} />, path: '/dashboard/upload' },
  { text: 'Notifications', icon: <Bell size={20} />, path: '/dashboard/notifications' },
  { text: 'Print History', icon: <HistoryIcon size={20} />, path: '/dashboard/history' },
  { text: 'My Wallet', icon: <Wallet size={20} />, path: '/dashboard/wallet' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userInitial, setUserInitial] = useState('U');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { mode, toggleTheme } = useThemeMode();
  const pathname = usePathname();

  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  const checkUser = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
    } else {
      const email = session.user.email;
      if (email) setUserInitial(email[0].toUpperCase());

      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, role, status')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        if (profile.status === 'suspended') {
          router.push('/suspended');
          return;
        }
        setAvatarUrl(profile.avatar_url);
        setUserRole(profile.role);
      }
    }
  }, [router]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const toggleDrawer = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
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

  const drawerContent = (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, justifyContent: (open || isMobile) ? 'space-between' : 'center' }}>
        {(open || isMobile) && (
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -1 }}>
            PrintPortal
          </Typography>
        )}
        {!isMobile && (
          <IconButton onClick={toggleDrawer} aria-label={open ? "Collapse sidebar" : "Expand sidebar"}>
            {open ? <ChevronLeft size={20} /> : <MenuIcon size={20} />}
          </IconButton>
        )}
        {isMobile && (
          <IconButton onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <ChevronLeft size={20} />
          </IconButton>
        )}
      </Box>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <Link href={item.path} passHref style={{ width: '100%' }}>
              <ListItemButton 
                selected={pathname === item.path}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{ 
                  borderRadius: 2,
                  justifyContent: (open || isMobile) ? 'initial' : 'center',
                  px: 2.5,
                  bgcolor: (theme) => pathname === item.path 
                    ? theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' 
                    : 'transparent',
                  '&.Mui-selected': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    color: 'text.primary',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {(open || isMobile) && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />}
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ mt: 'auto', p: 1.5 }}>
        <Divider sx={{ mb: 1 }} />
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'error.main', px: 2.5 }} aria-label="Sign out">
          <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', color: 'inherit' }}>
            <LogOut size={20} />
          </ListItemIcon>
          {(open || isMobile) && <ListItemText primary="Sign Out" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }} />}
        </ListItemButton>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      {!isMobile ? (
        <Drawer
          variant="permanent"
          open={open}
          sx={{
            width: open ? drawerWidth : 72,
            transition: (theme) => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
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
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: isMobile ? '100%' : `calc(100% - ${open ? drawerWidth : 72}px)` }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default', zIndex: 10 }}>
          <Toolbar sx={{ justifyContent: isMobile ? 'space-between' : 'flex-end', gap: 2 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <MenuIcon size={20} />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={toggleTheme} size="small" aria-label="Toggle theme">
                {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </IconButton>
              <NotificationPanel />
              <IconButton onClick={handleMenu} aria-label="User profile">
                <Avatar 
                  src={avatarUrl || undefined}
                  sx={{ width: 32, height: 32, bgcolor: 'text.primary', color: 'background.default', fontWeight: 700 }}
                >
                  {userInitial}
                </Avatar>
              </IconButton>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleClose(); router.push('/dashboard/profile'); }} sx={{ py: 1.2, borderRadius: 1.5, mx: 1, my: 0.5 }}>
                <ListItemIcon><User size={18} /></ListItemIcon>
                <ListItemText primary="Profile" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }} />
              </MenuItem>
              {userRole === 'admin' && (
                <MenuItem onClick={() => { handleClose(); router.push('/admin'); }} sx={{ py: 1.2, borderRadius: 1.5, mx: 1, my: 0.5 }}>
                  <ListItemIcon><ShieldCheck size={18} /></ListItemIcon>
                  <ListItemText primary="Admin Portal" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }} />
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout} sx={{ py: 1.2, borderRadius: 1.5, mx: 1, my: 0.5, color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'inherit' }}><LogOut size={18} /></ListItemIcon>
                <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }} />
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        
        <Box component="main" sx={{ p: 4, flexGrow: 1, overflow: 'auto' }}>
          <Container maxWidth="lg" disableGutters>
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
