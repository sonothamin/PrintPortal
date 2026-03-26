'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  TextField, 
  Divider,
  IconButton
} from '@mui/material';
import { 
  Printer, 
  Eye, 
  Plus,
  ChevronRight,
  BookOpen,
  Beaker,
  FileBadge
} from 'lucide-react';

const templates = [
  { id: '1', title: 'Lab Report Front Page', icon: <Beaker size={24} />, desc: 'Standard science faculty lab report cover with auto-filled date and ID.' },
  { id: '2', title: 'Assignment Cover', icon: <BookOpen size={24} />, desc: 'General purpose assignment cover page with course code and instructor fields.' },
  { id: '3', title: 'Thesis Draft Front', icon: <FileBadge size={24} />, desc: 'Formal thesis cover page following university style guidelines.' },
];

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Print Templates
        </Typography>
        <Typography color="text.secondary">
          Generate and print course-specific documents directly by filling out simple forms.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Template Selection */}
        <Grid size={{ xs: 12, md: selectedTemplate ? 5 : 12 }}>
          <Grid container spacing={3}>
            {templates.map((template) => (
              <Grid size={{ xs: 12, sm: selectedTemplate ? 12 : 4 }} key={template.id}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 2, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderColor: selectedTemplate === template.id ? 'black' : 'divider',
                    borderWidth: selectedTemplate === template.id ? 2 : 1,
                    '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main' }
                  }}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', p: 1, borderRadius: 2 }}>
                        {template.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{template.title}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {template.desc}
                    </Typography>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      sx={{ borderRadius: 2, fontWeight: 700 }}
                      endIcon={<ChevronRight size={18} />}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Form Area */}
        {selectedTemplate && (
          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, position: 'sticky', top: 24 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {templates.find(t => t.id === selectedTemplate)?.title} Details
                  </Typography>
                  <IconButton onClick={() => setSelectedTemplate(null)} size="small">
                    <Plus size={18} style={{ transform: 'rotate(45deg)' }} />
                  </IconButton>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="Course Code" defaultValue="CS101" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="Course Name" defaultValue="Intro to Computer Science" />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField fullWidth label="Experiment/Assignment Title" placeholder="Enter title..." />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="Submitted By" defaultValue="John Doe" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="Student ID" defaultValue="2026-UG-1102" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="Instructor Name" placeholder="Dr. Smith" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField type="date" fullWidth label="Submission Date" InputLabelProps={{ shrink: true }} />
                    </Grid>
                  </Grid>

                  <Divider />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="large" 
                      sx={{ flex: 1, borderRadius: 2, fontWeight: 700 }}
                      startIcon={<Eye size={20} />}
                    >
                      Preview
                    </Button>
                    <Button 
                      variant="contained" 
                      size="large" 
                      sx={{ flex: 1, bgcolor: 'text.primary', color: 'background.default', borderRadius: 2, fontWeight: 700 }}
                      startIcon={<Printer size={20} />}
                    >
                      Instant Print
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </DashboardLayout>
  );
}
