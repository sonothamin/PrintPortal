'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import NotificationHistory from '@/components/NotificationHistory';
import { Container } from '@mui/material';

export default function UserNotifications() {
  return (
    <DashboardLayout>
      <Container maxWidth="md" disableGutters>
        <NotificationHistory />
      </Container>
    </DashboardLayout>
  );
}
