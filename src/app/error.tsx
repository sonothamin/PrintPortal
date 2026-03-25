'use client';

import React from 'react';
import { Box, Typography, Button, Container, alpha } from '@mui/material';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        textAlign: 'center'
      }}
    >
      <Container maxWidth="md">
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
            mb: 3
          }}
        >
          <AlertTriangle size={40} />
        </Box>

        <Typography 
          variant="h1" 
          sx={{ 
            fontWeight: 900, 
            mb: 0, 
            color: '#ff6b6b',
            fontSize: { xs: '5rem', md: '10rem' },
            lineHeight: 1,
            letterSpacing: '-0.05em'
          }}
        >
          500
        </Typography>

        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
          System Error
        </Typography>

        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
          Something went wrong in our system. We are working to fix it.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            size="large"
            startIcon={<RefreshCcw size={20} />}
            onClick={() => reset()}
            sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 700, textTransform: 'none' }}
          >
            Try Again
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            startIcon={<Home size={20} />}
            onClick={() => window.location.href = '/'}
            sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 700, textTransform: 'none' }}
          >
            Back to Home
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
