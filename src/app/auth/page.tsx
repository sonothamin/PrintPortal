'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  Link,
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
  Mail,
  Lock,
  Printer,
  Phone,
  User
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [view, setView] = useState<'login' | 'signup' | 'forgotPassword'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setLoading(true);

    try {
      if (view === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        router.push('/dashboard');
      } else if (view === 'signup') {
        // Signup
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone_number: phoneNumber,
            }
          }
        });

        if (authError) throw authError;
        
        setStatusMsg({ text: 'Registration successful! You can now log in.', type: 'success' });
        setView('login');
      } else if (view === 'forgotPassword') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setStatusMsg({ text: 'Password reset link sent! Please check your email.', type: 'success' });
      }
    } catch (err: any) {
      let message = err.message || 'An error occurred during authentication';
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password.';
      }
      setStatusMsg({ text: message, type: 'error' });
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
            background: (theme) => theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)' 
              : 'linear-gradient(135deg, #000000 0%, #333333 100%)',
            color: 'background.default',
            p: 6,
            borderRight: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none'
          }}
        >
          <Box sx={{ maxWidth: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: 'white' }}>
              <Printer size={48} strokeWidth={2.5} />
              <Typography variant="h4" sx={{ ml: 2, fontWeight: 900, letterSpacing: -1.5 }}>
                PrintPortal
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4, fontWeight: 400 }}>
              The all-in-one portal for seamless document management 
              and instant kiosk pick-ups.
            </Typography>
            
          </Box>
        </Grid>

        {/* Right Side - Auth Form */}
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
            <Box 
              sx={{ 
                textAlign: { xs: 'center', md: 'left' },
                mb: 4
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                {view === 'login' && 'Welcome back'}
                {view === 'signup' && 'Create an account'}
                {view === 'forgotPassword' && 'Reset password'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {view === 'login' && 'Please enter your details to sign in.'}
                {view === 'signup' && 'Join the PrintPortal printing network today.'}
                {view === 'forgotPassword' && 'Enter your email to receive a reset link.'}
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
              {view === 'signup' && (
                <>
                  <TextField
                    fullWidth
                    label="Full Name"
                    margin="normal"
                    variant="outlined"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <User size={20} color="#6c757d" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Phone Number"
                    margin="normal"
                    variant="outlined"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone size={20} color="#6c757d" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </>
              )}
              <TextField
                fullWidth
                label="Email address"
                margin="normal"
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={20} color="#6c757d" />
                    </InputAdornment>
                  ),
                }}
              />
              {view !== 'forgotPassword' && (
                <TextField
                  fullWidth
                  label="Password"
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
              )}
              {view === 'signup' && (
                <TextField
                  fullWidth
                  label="Confirm Password"
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
              )}

              {view === 'login' && (
                <Box sx={{ textAlign: 'right', mt: 1 }}>
                  <Link 
                    component="button"
                    variant="body2" 
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                    onClick={(e) => {
                      e.preventDefault();
                      setView('forgotPassword');
                      setStatusMsg(null);
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>
              )}

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ 
                  mt: 3, 
                  py: 1.5, 
                  borderRadius: 2,
                  bgcolor: 'text.primary',
                  color: 'background.default',
                  '&:hover': { bgcolor: 'text.secondary' }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : (
                  view === 'login' ? 'Sign In' : (view === 'signup' ? 'Sign Up' : 'Send Reset Link')
                )}
              </Button>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {view === 'login' && (
                    <>
                      Don't have an account?{' '}
                      <Link 
                        component="button"
                        variant="body2" 
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                        onClick={(e) => {
                          e.preventDefault();
                          setView('signup');
                          setStatusMsg(null);
                        }}
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                  {view === 'signup' && (
                    <>
                      Already have an account?{' '}
                      <Link 
                        component="button"
                        variant="body2" 
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                        onClick={(e) => {
                          e.preventDefault();
                          setView('login');
                          setStatusMsg(null);
                        }}
                      >
                        Sign in
                      </Link>
                    </>
                  )}
                  {view === 'forgotPassword' && (
                    <Link 
                      component="button"
                      variant="body2" 
                      sx={{ fontWeight: 700, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.preventDefault();
                        setView('login');
                        setStatusMsg(null);
                      }}
                    >
                      Back to login
                    </Link>
                  )}
                </Typography>
              </Box>
            </Box>
          </Container>
        </Grid>
      </Grid>
    </Box>
  );
}
