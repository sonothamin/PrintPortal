'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  TextField, 
  Avatar, 
  IconButton,
  CircularProgress,
  Divider,
  Alert
} from '@mui/material';
import { 
  Camera, 
  Save, 
  User as UserIcon, 
  Mail, 
  Phone, 
  ShieldCheck 
} from 'lucide-react';

interface UserProfile {
  full_name: string;
  phone_number: string;
  role: string;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState({ text: '', type: 'info' as 'info' | 'success' | 'error' });

  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setEmail(session.user.email || '');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone_number || '');
    } else if (error && error.code === 'PGRST116') {
      // Profile missing - create one
      const { data: newData } = await supabase
        .from('profiles')
        .insert({ id: session.user.id, full_name: 'Student User', role: 'user' })
        .select()
        .single();
      if (newData) {
        setProfile(newData);
        setFullName(newData.full_name || '');
      }
    } else {
      console.error('Error fetching profile:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus({ text: '', type: 'info' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName, 
          phone_number: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (error) throw error;
      setStatus({ text: 'Profile updated successfully!', type: 'success' });
      fetchProfile();
    } catch (err: any) {
      setStatus({ text: err.message || 'Error updating profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(filePath);

      // 3. Update Profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setStatus({ text: 'Avatar updated!', type: 'success' });
      fetchProfile();
    } catch (err: any) {
      setStatus({ text: err.message || 'Error uploading avatar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Profile Settings
        </Typography>
        <Typography color="text.secondary">
          Update your personal information and profile picture.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, textAlign: 'center', p: 4 }}>
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
              <Avatar 
                src={profile?.avatar_url || undefined} 
                sx={{ width: 120, height: 120, mb: 2, fontSize: '3rem', bgcolor: 'text.primary', color: 'background.default', fontWeight: 700 }}
              >
                {fullName?.[0] || 'U'}
              </Avatar>
              <IconButton 
                component="label"
                sx={{ 
                  position: 'absolute', 
                  bottom: 15, 
                  right: -5, 
                  bgcolor: 'text.primary', 
                  color: 'background.default',
                  '&:hover': { bgcolor: 'text.secondary' }
                }}
              >
                <input hidden accept="image/*" type="file" onChange={handleAvatarUpload} />
                <Camera size={18} />
              </IconButton>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{fullName || 'Student User'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{profile?.role?.toUpperCase() || 'USER'}</Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', color: 'success.main' }}>
              <ShieldCheck size={16} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>VERIFIED ACCOUNT</Typography>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 4 }}>Account Details</Typography>
              
              {status.text && (
                <Alert severity={status.type} sx={{ mb: 4, borderRadius: 2 }}>{status.text}</Alert>
              )}

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField 
                    fullWidth 
                    label="Full Name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    InputProps={{
                      startAdornment: <UserIcon size={20} style={{ marginRight: 12, opacity: 0.5 }} />
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField 
                    fullWidth 
                    label="Email Address" 
                    disabled
                    value={email}
                    InputProps={{
                      startAdornment: <Mail size={20} style={{ marginRight: 12, opacity: 0.5 }} />
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField 
                    fullWidth 
                    label="Phone Number" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    InputProps={{
                      startAdornment: <Phone size={20} style={{ marginRight: 12, opacity: 0.5 }} />
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 6, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : <Save size={20} />}
                  sx={{ 
                    bgcolor: 'text.primary', 
                    color: 'background.default', 
                    borderRadius: 2, 
                    px: 4,
                    '&:hover': { bgcolor: 'text.secondary' }
                  }}
                >
                  Save Changes
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}
