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
  Container,
  Paper,
  Button
} from '@mui/material';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileText, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu as MenuIcon,
  ChevronLeft,
  Bell,
  User,
  Sun,
  Moon,
  History as HistoryIcon
} from 'lucide-react';
import { useThemeMode } from '@/theme/ThemeContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { text: 'Upload Documents', icon: <UploadCloud size={20} />, path: '/dashboard/upload' },
  { text: 'Print History', icon: <HistoryIcon size={20} />, path: '/dashboard/history' },
  { text: 'My Wallet', icon: <Wallet size={20} />, path: '/dashboard/wallet' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userInitial, setUserInitial] = useState('U');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { mode, toggleTheme } = useThemeMode();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      } else {
        const email = session.user.email;
        if (email) setUserInitial(email[0].toUpperCase());

        // Fetch profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setAvatarUrl(profile.avatar_url);
        }
      }
    };
    checkUser();
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, justifyContent: open ? 'space-between' : 'center' }}>
          {open && (
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -1 }}>
              PrintPortal
            </Typography>
          )}
          <IconButton onClick={toggleDrawer}>
            {open ? <ChevronLeft size={20} /> : <MenuIcon size={20} />}
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ px: 1.5, py: 2 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Link href={item.path} passHref style={{ width: '100%' }}>
                <ListItemButton 
                  selected={pathname === item.path}
                  sx={{ 
                    borderRadius: 2,
                    justifyContent: open ? 'initial' : 'center',
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
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center' }}>
                    {item.icon}
                  </ListItemIcon>
                  {open && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />}
                </ListItemButton>
              </Link>
            </ListItem>
          ))}
        </List>
        

        <Divider sx={{ mt: 2 }} />
        <List sx={{ px: 1.5, py: 2 }}>
          <ListItem disablePadding>
            <Link href="/dashboard/settings" passHref style={{ width: '100%' }}>
              <ListItemButton sx={{ borderRadius: 2, px: 2.5 }}>
                <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto' }}>
                  <Settings size={20} />
                </ListItemIcon>
                {open && <ListItemText primary="Settings" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />}
              </ListItemButton>
            </Link>
          </ListItem>
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ justifyContent: 'flex-end', gap: 2 }}>
            <IconButton onClick={toggleTheme} size="small" sx={{ mr: 1 }}>
              {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>
            <IconButton size="small">
              <Bell size={20} />
            </IconButton>
            <IconButton onClick={handleMenu}>
              <Avatar 
                src={avatarUrl || undefined}
                sx={{ width: 32, height: 32, bgcolor: 'text.primary', color: 'background.default', fontWeight: 700 }}
              >
                {userInitial}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleClose(); router.push('/dashboard/profile'); }}>
                <ListItemIcon><User size={18} /></ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogOut size={18} /></ListItemIcon>
                Logout
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
