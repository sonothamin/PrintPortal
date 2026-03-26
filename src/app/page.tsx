'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Divider,
  AppBar,
  Toolbar,
  Avatar,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Printer,
  UploadCloud,
  Wallet,
  Zap,
  Database,
  ShieldCheck,
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) setProfile(profile);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.refresh();
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            <Printer size={24} color="currentColor" />
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, ml: 1, fontWeight: 800, color: 'text.primary', letterSpacing: -0.5 }}
            >
              PrintPortal
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : user ? (
                <>
                  <Box
                    onClick={handleOpenMenu}
                    sx={{
                      display: { xs: 'none', sm: 'flex' },
                      alignItems: 'center',
                      gap: 1.5,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      px: 2,
                      py: 0.75,
                      borderRadius: 10,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        borderColor: 'text.primary'
                      }
                    }}
                  >
                    <Avatar
                      src={profile?.avatar_url || undefined}
                      sx={{ width: 24, height: 24, fontSize: '0.7rem', fontWeight: 800, bgcolor: 'text.primary', color: 'background.default' }}
                    >
                      {(profile?.full_name || user.email || '?')[0].toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                    </Typography>
                  </Box>

                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    PaperProps={{
                      sx: {
                        mt: 1.5,
                        borderRadius: 3,
                        minWidth: 200,
                        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.8)' : '0 8px 32px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider'
                      }
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{profile?.full_name || 'My Account'}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>{user.email}</Typography>
                    </Box>
                    <Divider />
                    <Link href="/dashboard" passHref style={{ color: 'inherit', textDecoration: 'none' }}>
                      <MenuItem onClick={handleCloseMenu} sx={{ py: 1.2, borderRadius: 1.5, mx: 1, my: 0.5 }}>
                        <ListItemIcon><LayoutDashboard size={18} /></ListItemIcon>
                        <ListItemText primary="Go to Dashboard" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }} />
                      </MenuItem>
                    </Link>
                    {profile?.role === 'admin' && (
                      <Link href="/admin" passHref style={{ color: 'inherit', textDecoration: 'none' }}>
                        <MenuItem onClick={handleCloseMenu} sx={{ py: 1.2, borderRadius: 1.5, mx: 1, my: 0.5 }}>
                          <ListItemIcon><ShieldCheck size={18} /></ListItemIcon>
                          <ListItemText primary="Admin Portal" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }} />
                        </MenuItem>
                      </Link>
                    )}
                    <MenuItem onClick={handleLogout} sx={{ py: 1.2, borderRadius: 1.5, mx: 1, my: 0.5, color: 'error.main' }}>
                      <ListItemIcon sx={{ color: 'inherit' }}><LogOut size={18} /></ListItemIcon>
                      <ListItemText primary="Sign Out" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem' }} />
                    </MenuItem>
                  </Menu>

                  <Link href="/dashboard" passHref>
                    <Button
                      variant="contained"
                      startIcon={<LayoutDashboard size={18} />}
                      sx={{ bgcolor: 'text.primary', color: 'background.default', borderRadius: 1.5, px: 3, fontWeight: 700 }}
                    >
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth" passHref>
                    <Button color="inherit" sx={{ fontWeight: 600 }}>Login</Button>
                  </Link>
                  <Link href="/auth" passHref>
                    <Button variant="contained" sx={{ bgcolor: 'text.primary', color: 'background.default', borderRadius: 1.5, px: 3 }}>Get Started</Button>
                  </Link>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{ py: 12, bgcolor: 'background.default' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'grey.100',
              px: 2,
              py: 0.5,
              borderRadius: 10,
              mb: 4
            }}
          >
            <Zap size={14} fill="currentColor" />
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              Print Smarter. Campus Faster.
            </Typography>
          </Box>
          <Typography
            variant="h2"
            sx={{ fontWeight: 900, mb: 3, letterSpacing: -2, lineHeight: 1.1 }}
          >
            Say goodbye to print hassles.
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 6, fontWeight: 400, maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}
          >
            Upload from your hall, home or classroom, grab your prints from any kiosk.
            <Box component="span" sx={{ display: 'block', mt: 1, fontWeight: 700, color: 'text.primary' }}>
              It's really that simple!
            </Box>
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Link href="/dashboard" passHref>
              <Button
                variant="contained"
                size="large"
                sx={{ bgcolor: 'text.primary', color: 'background.default', py: 2, px: 4, borderRadius: 2, fontSize: '1.1rem' }}
              >
                Start Printing Now
              </Button>
            </Link>
          </Box>
        </Container>
      </Box>

      {/* Features Grid */}
      <Container maxWidth="lg" sx={{ pb: 12 }}>
        <Grid container spacing={4}>
          {[
            {
              icon: <UploadCloud size={32} />,
              title: 'Upload Anytime, Anywhere',
              desc: 'Send documents straight from your phone or laptop. Your print job travels faster than you do.'
            },
            {
              icon: <Database size={32} />,
              title: 'Built for Students',
              desc: 'Generate polished cover pages and lab reports in seconds with ready-to-use course templates.'
            },
            {
              icon: <Wallet size={32} />,
              title: 'Smart Wallet, Smarter Spending',
              desc: 'Recharge instantly with QR codes and keep full control of your printing budget.'
            },
            {
              icon: <ShieldCheck size={32} />,
              title: 'Print Securely, Pick Up Easily',
              desc: 'Your documents stay private. Release prints using a secure code or quick QR scan at any PrintPortal kiosk.'
            }
          ].map((feature, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ mb: 2, color: 'primary.main' }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ py: 6, mt: 'auto', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', fontStyle: 'italic', mb: 3 }}>
            PrintPortal - because your time matters.
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', opacity: 0.5 }}>
            © 2026 PrintPortal - Sonoth Amin  • 
           <Typography variant="body2"><Link href="/legals">Legals</Link></Typography> 
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
