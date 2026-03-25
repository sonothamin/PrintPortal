'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  TextField, 
  Button, 
  Container,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Printer
} from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Form State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Check if we have a session (the reset link should provide one)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatusMsg({ text: 'Invalid or expired reset link. Please request a new one.', type: 'error' });
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (password !== confirmPassword) {
      setStatusMsg({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    if (password.length < 6) {
      setStatusMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStatusMsg({ text: 'Password updated successfully! Redirecting...', type: 'success' });
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to update password.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Grid container>
        {/* Left Side - Hero/Branding */}
        <Grid 
          size={{ xs: 0, md: 6 }} 
          sx={{ 
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
            color: 'white',
            p: 6,
            borderRight: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Box sx={{ maxWidth: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Printer size={48} strokeWidth={2.5} />
              <Typography variant="h4" sx={{ ml: 2, fontWeight: 900, letterSpacing: -1.5 }}>
                PrintPortal
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4, fontWeight: 400 }}>
              Securely update your credentials to regain access 
              to your document management workspace.
            </Typography>
          </Box>
        </Grid>

        {/* Right Side - Reset Form */}
        <Grid 
          size={{ xs: 12, md: 6 }} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            bgcolor: 'background.default'
          }}
        >
          <Container maxWidth="xs">
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Update password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please enter your new password below.
              </Typography>
            </Box>

            <Box component="form" noValidate onSubmit={handleSubmit}>
              {statusMsg && (
                <Alert 
                  severity={statusMsg.type} 
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  {statusMsg.text}
                </Alert>
              )}
              
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={20} color="#6c757d" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                variant="outlined"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={20} color="#6c757d" />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || (statusMsg?.type === 'error' && statusMsg.text.includes('Expired'))}
                sx={{ 
                  mt: 3, 
                  py: 1.5, 
                  borderRadius: 2,
                  bgcolor: 'text.primary',
                  color: 'background.default',
                  '&:hover': { bgcolor: 'text.secondary' }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
              </Button>
            </Box>
          </Container>
        </Grid>
      </Grid>
    </Box>
  );
}
