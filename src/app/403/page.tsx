'use client';

import React from 'react';
import { Box, Typography, Button, Container, alpha } from '@mui/material';
import { Lock, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ForbiddenPage() {
  const router = useRouter();

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
            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1),
            color: 'warning.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}
        >
          <Lock size={40} />
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
          403
        </Typography>

        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
          Access Forbidden
        </Typography>

        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
          You do not have permission to access this resource.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            size="large"
            startIcon={<Home size={20} />}
            onClick={() => router.push('/')}
            sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 700, textTransform: 'none' }}
          >
            Back to Home
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            startIcon={<ArrowLeft size={20} />}
            onClick={() => router.back()}
            sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 700, textTransform: 'none' }}
          >
            Go Back
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
