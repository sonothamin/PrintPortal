'use client';

import React from 'react';
import { Box, Typography, Button, Container, alpha } from '@mui/material';
import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SuspendedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        color: 'text.primary',
        p: 4,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Accent */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          bgcolor: (theme) => alpha(theme.palette.error.main, 0.03),
          filter: 'blur(80px)',
          zIndex: 0
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
              color: 'error.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              boxShadow: (theme) => `0 0 20px ${alpha(theme.palette.error.main, 0.1)}`
            }}
          >
            <ShieldAlert size={40} />
          </Box>

          <Typography variant="h3" sx={{ fontWeight: 800, mb: 0, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>
            Account
          </Typography>

          <Typography
            variant="h1"
            sx={{
              fontWeight: 900,
              mb: 2,
              letterSpacing: '-0.04em',
              fontSize: { xs: '4rem', md: '7rem' },
              color: '#ff6b6b',
              lineHeight: 1
            }}
          >
            SUSPENDED
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 6, fontWeight: 500, maxWidth: '600px', mx: 'auto', lineHeight: 1.5 }}>
           Your access to all services of this site has been revoked.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, justifyContent: 'center', mb: 4 }}>
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<LogOut size={22} />}
              onClick={handleLogout}
              sx={{
                px: 6,
                py: 2,
                borderRadius: 2,
                fontWeight: 900,
                textTransform: 'none',
                fontSize: '1.1rem',
                boxShadow: (theme) => `0 10px 20px ${alpha(theme.palette.error.main, 0.3)}`
              }}
            >
              Securely Sign Out
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              onClick={() => router.push('/')}
              sx={{ px: 6, py: 2, borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '1.1rem' }}
            >
              Back to Home
            </Button>
          </Box>
        </Box>
      </Container>

      {/* Footer Branding */}
      <Box sx={{ mt: 'auto', pb: 4, opacity: 0.5, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.3em', display: 'block', mb: 1 }}>
          If you believe this is a mistake, please contact support at sonothamin@mailto.com.
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
          © 2026 PrintPortal - Sonoth Amin
        </Typography>
      </Box>
    </Box>
  );
}
