'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPortalLayout from '@/components/AdminPortalLayout';
import { 
  Typography, 
  Box, 
  Card, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Avatar, 
  Chip, 
  IconButton, 
  TextField, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { 
  Search, 
  UserPlus, 
  ShieldAlert, 
  Wallet, 
  History, 
  Ban,
  MoreVertical,
  Mail,
  Phone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isValidPrice } from '@/lib/validation';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'admin';
  wallet_balance: number;
  avatar_url: string | null;
  phone_number: string | null;
  status: 'active' | 'suspended';
  created_at: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editBalance, setEditBalance] = useState<string>('0');
  const [updatingBalance, setUpdatingBalance] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchUsers = React.useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateBalance = async () => {
    if (!selectedUser) return;
    setUpdatingBalance(true);
    
    const amount = parseFloat(editBalance);
    if (!isValidPrice(amount)) {
      alert('Please enter a valid non-negative number.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'update-balance', user_id: selectedUser.id, new_balance: amount }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to update balance');
      }

      fetchUsers();
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (user: Profile) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const confirmMsg = `Are you sure you want to ${newStatus === 'suspended' ? 'SUSPEND' : 'REACTIVATE'} ${user.full_name || user.email}?`;
    
    if (!confirm(confirmMsg)) return;
    setUpdatingStatus(user.id);

    try {
      const { data, error } = await supabase.functions.invoke('user-status-update', {
        body: { user_id: user.id, status: newStatus }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to update user status');
      }

      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    user.phone_number?.includes(searchQuery)
  );

  return (
    <AdminPortalLayout>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.5, mb: 1 }}>
            User Management
          </Typography>
          <Typography color="text.secondary">
            Manage student records, roles, and administrative permissions.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<UserPlus size={18} />} 
          sx={{ fontWeight: 700, borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
          onClick={() => {
            const subject = encodeURIComponent('You\'re Invited to PrintPortal!');
            const body = encodeURIComponent(
`Hi there!

You've been invited to join PrintPortal — your all-in-one printing solution.

🖨️ What you can do:
• Upload PDFs securely from any device
• Pay with your digital wallet (no cash needed)
• Pick up prints at any kiosk using a QR code

🚀 Getting Started:
1. Visit our portal and sign up with your email
2. Top up your wallet using a recharge token
3. Upload your documents and print!

If you have any questions, feel free to reach out to the admin team.

Best regards,
PrintPortal Administration`
            );
            window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
          }}
        >
          Invite Member
        </Button>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => alpha(theme.palette.background.default, 0.5) }}>
          <Box sx={{ position: 'relative', width: '100%', maxWidth: 450 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <TextField 
              fullWidth 
              size="small" 
              placeholder="Search users by name, email, or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { pl: 5, borderRadius: 2, bgcolor: 'background.paper' } }}
            />
          </Box>
        </Box>

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>USER</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>ROLE</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>BALANCE</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>CONTACT</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>JOINED</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>STATUS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={user.avatar_url || undefined} sx={{ width: 36, height: 36, bgcolor: 'text.primary', color: 'background.default', fontWeight: 800, fontSize: '0.8rem' }}>
                        {user.full_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{user.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      size="small" 
                      color={user.role === 'admin' ? 'secondary' : 'default'}
                      variant={user.role === 'admin' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: user.wallet_balance > 0 ? 'success.main' : 'error.main' }}>
                      ৳{user.wallet_balance.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={`Email: ${user.email}`}>
                        <IconButton size="small" component="a" href={`mailto:${user.email}`}>
                          <Mail size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={user.phone_number ? `Call: ${user.phone_number}` : 'No Phone'}>
                        <span>
                          <IconButton size="small" component="a" href={user.phone_number ? `tel:${user.phone_number}` : undefined} disabled={!user.phone_number}>
                            <Phone size={16} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{new Date(user.created_at).toLocaleDateString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status || 'active'} 
                      size="small" 
                      color={user.status === 'suspended' ? 'error' : 'success'}
                      variant="outlined"
                      sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Wallet Adjustment">
                      <IconButton size="small" onClick={() => { setSelectedUser(user); setEditBalance(user.wallet_balance.toString()); }}>
                        <Wallet size={18} />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title={user.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleToggleStatus(user)}
                        color={user.status === 'suspended' ? 'success' : 'error'}
                        disabled={updatingStatus === user.id}
                      >
                        {updatingStatus === user.id ? <CircularProgress size={18} color="inherit" /> : (user.status === 'suspended' ? <ShieldAlert size={18} /> : <Ban size={18} />)}
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="View Request History">
                      <IconButton size="small" onClick={() => router.push(`/admin/queue?user_id=${user.id}`)}>
                        <History size={18} />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small"><MoreVertical size={18} /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Wallet Edit Dialog */}
      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Adjust Wallet Balance</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Updating balance for <strong>{selectedUser?.full_name}</strong>. Current: ৳{selectedUser?.wallet_balance.toFixed(2)}.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="New Balance (BDT)"
            type="number"
            fullWidth
            variant="outlined"
            value={editBalance}
            onChange={(e) => setEditBalance(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setSelectedUser(null)} disabled={updatingBalance}>Cancel</Button>
          <Button 
            onClick={handleUpdateBalance} 
            variant="contained" 
            color="primary" 
            disabled={updatingBalance}
            startIcon={updatingBalance ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ fontWeight: 800 }}
          >
            {updatingBalance ? 'Updating...' : 'Confirm Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPortalLayout>
  );
}
