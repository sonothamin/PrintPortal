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
  IconButton
} from '@mui/material';
import { 
  Printer, 
  UploadCloud, 
  Wallet, 
  Database, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="/auth" passHref>
                <Button color="inherit" sx={{ fontWeight: 600 }}>Login</Button>
              </Link>
              <Link href="/auth" passHref>
                <Button variant="contained" sx={{ bgcolor: 'text.primary', color: 'background.default', borderRadius: 1.5, px: 3 }}>Get Started</Button>
              </Link>
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
              Instant Campus Printing
            </Typography>
          </Box>
          <Typography 
            variant="h2" 
            sx={{ fontWeight: 900, mb: 3, letterSpacing: -2, lineHeight: 1 }}
          >
            The easiest way to print your documents on PrintPortal.
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ mb: 6, fontWeight: 400, maxWidth: 600, mx: 'auto' }}
          >
            Upload from your dorm, pick up at any kiosk. Zero friction, total convenience.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Link href="/auth" passHref>
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
              title: 'Online Upload', 
              desc: 'Upload PDFs, Word docs, and more directly from your browser or mobile.' 
            },
            { 
              icon: <Database size={32} />, 
              title: 'Course Templates', 
              desc: 'Fill out forms to generate front pages and lab report templates automatically.' 
            },
            { 
              icon: <Wallet size={32} />, 
              title: 'Smart Wallet', 
              desc: 'Top up with QR codes and manage your printing budget seamlessly.' 
            },
            { 
              icon: <ShieldCheck size={32} />, 
              title: 'Secure Release', 
              desc: 'Use unique codes or QR scans to release your prints at any PrintPortal kiosk.' 
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
          <Typography variant="body2" color="text.secondary" align="center">
            © 2026 PrintPortal Service. Minimalist design for maximum productivity.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
