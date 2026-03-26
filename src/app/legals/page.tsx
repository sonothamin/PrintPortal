'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Container,
    Tab,
    Tabs,
    Paper,
    Divider,
    Breadcrumbs,
    Link as MuiLink
} from '@mui/material';
import { Scale, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel({ children, value, index, ...other }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 4 }}>{children}</Box>}
        </div>
    );
}

export default function LegalPage() {
    const [value, setValue] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    // Pulling weights and colors from theme via system props
    const sectionHeaderSx = {
        mt: 4,
        mb: 2,
        color: 'text.primary',
    };

    const bodySx = {
        lineHeight: 1.7,
        color: 'text.secondary',
        mb: 2,
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
            {/* Header Section */}
            <Box sx={{ py: 8, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Container maxWidth="md">
                    <Breadcrumbs
                        separator={<ChevronRight size={14} />}
                        sx={{ mb: 3, '& .MuiTypography-root': { fontSize: '0.85rem' } }}
                    >
                        <MuiLink component={Link} href="/" underline="hover" color="inherit">
                            Home
                        </MuiLink>
                        <Typography color="text.primary">Legal</Typography>
                    </Breadcrumbs>

                    <Typography variant="h2" gutterBottom>
                        Legal Center
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Review our terms, privacy commitments, and usage agreements.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{letterSpacing: 1, fontWeight: 400 }}>
                                Effective Date: March 26, 2026
                            </Typography>
                </Container>
            </Box>

            <Container maxWidth="md" sx={{ mt: -4 }}>
                <Paper
                    variant="outlined"
                    sx={{
                        borderRadius: 4,
                        overflow: 'hidden',
                    }}
                >
                    <Tabs
                        value={value}
                        onChange={handleChange}
                        variant="fullWidth"
                        indicatorColor="primary"
                        textColor="primary"
                        sx={{
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'grey.50',
                            '& .MuiTab-root': { py: 3 }
                        }}
                    >
                        <Tab icon={<FileText size={18} />} iconPosition="start" label="Terms" />
                        <Tab icon={<Scale size={18} />} iconPosition="start" label="EULA" />
                        <Tab icon={<ShieldCheck size={18} />} iconPosition="start" label="Privacy" />
                    </Tabs>

                    <Box sx={{ px: { xs: 3, md: 6 }, pb: 6 }}>
                        {/* 1. Terms of Service */}
                        <CustomTabPanel value={value} index={0}>
                            
                            <Typography variant="h4" sx={sectionHeaderSx}>
                                Terms of Service (ToS)
                            </Typography>

                            <Typography sx={bodySx}>
                                By accessing and using PrintPortal, you agree to comply with and be bound by these Terms of Service. PrintPortal provides document management and printing fulfillment services for authorized campus users.
                            </Typography>

                            <Typography variant="h6" sx={sectionHeaderSx}>User Accounts & Wallets</Typography>
                            <Box component="ul" sx={{ pl: 2 }}>
                                <li><Typography sx={bodySx}><strong>Eligibility:</strong> Access is limited to active students, faculty, and staff with valid institutional credentials.</Typography></li>
                                <li><Typography sx={bodySx}><strong>Wallet Balances:</strong> Funds added via vouchers or digital payments are non-refundable and non-transferable.</Typography></li>
                                <li><Typography sx={bodySx}><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials and print release methods.</Typography></li>
                            </Box>

                            <Typography variant="h6" sx={sectionHeaderSx}>Usage Conduct</Typography>
                            <Box component="ul" sx={{ pl: 2 }}>
                                <li><Typography sx={bodySx}><strong>Prohibited Content:</strong> Uploading copyrighted, malicious, or illegal content is strictly prohibited.</Typography></li>
                                <li><Typography sx={bodySx}><strong>System Abuse:</strong> Attempts to manipulate pricing, balances, or kiosk operations will result in suspension.</Typography></li>
                            </Box>

                            <Typography variant="h6" sx={sectionHeaderSx}>Termination</Typography>
                            <Typography sx={bodySx}>
                                The institution reserves the right to suspend or terminate access for violations or loss of institutional affiliation.
                            </Typography>
                        </CustomTabPanel>

                        {/* 2. EULA */}
                        <CustomTabPanel value={value} index={1}>
                            <Typography variant="h4" sx={sectionHeaderSx}>
                                End User License Agreement (EULA)
                            </Typography>

                            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4, fontStyle: 'italic' }}>
                                Applicable to Kiosk Terminals and Web Interface
                            </Typography>

                            <Typography variant="h6" sx={sectionHeaderSx}>Grant of License</Typography>
                            <Typography sx={bodySx}>
                                The Institution grants you a personal, non-exclusive, non-transferable, limited license to use the PrintPortal software solely for document printing and account management.
                            </Typography>

                            <Typography variant="h6" sx={sectionHeaderSx}>Restrictions</Typography>
                            <Box component="ul" sx={{ pl: 2 }}>
                                <li><Typography sx={bodySx}>You may not reverse engineer, decompile, or attempt to extract source code.</Typography></li>
                                <li><Typography sx={bodySx}>You may not modify or create derivative works of the platform.</Typography></li>
                                <li><Typography sx={bodySx}>You may not remove proprietary notices or branding.</Typography></li>
                            </Box>

                            <Typography variant="h6" sx={sectionHeaderSx}>Limitation of Liability</Typography>
                            <Typography sx={bodySx}>
                                PrintPortal is provided <strong>"AS IS"</strong>. The Institution is not liable for failed print jobs, formatting inconsistencies, or data loss due to technical issues.
                            </Typography>
                        </CustomTabPanel>

                        {/* 3. Privacy Policy */}
                        <CustomTabPanel value={value} index={2}>
                            <Typography variant="h4" sx={sectionHeaderSx}>
                                Privacy Policy (PP)
                            </Typography>

                            <Typography variant="h6" sx={sectionHeaderSx}>Data We Collect</Typography>
                            <Box component="ul" sx={{ pl: 2 }}>
                                <li><Typography sx={bodySx}><strong>Identity Data:</strong> Name and institutional email.</Typography></li>
                                <li><Typography sx={bodySx}><strong>Transaction Data:</strong> Wallet activity and print logs.</Typography></li>
                                <li><Typography sx={bodySx}><strong>Document Data:</strong> Uploaded files stored securely and temporarily.</Typography></li>
                            </Box>

                            <Typography variant="h6" sx={sectionHeaderSx}>How We Use Data</Typography>
                            <Typography sx={bodySx}>
                                Data is used to provide printing services, maintain transaction records, and support troubleshooting and administration.
                            </Typography>

                            <Typography variant="h6" sx={sectionHeaderSx}>Data Retention & Security</Typography>
                            <Typography sx={bodySx}>
                                <strong>Ephemeral Storage:</strong> Files are automatically deleted after printing or within a limited time window.
                            </Typography>

                            <Typography sx={bodySx}>
                                <strong>Access Control:</strong> Only the user and designated system components can access uploaded files. Administrators do not have default access to document contents.
                            </Typography>

                            <Typography variant="h6" sx={sectionHeaderSx}>Third-Party Sharing</Typography>
                            <Typography sx={bodySx}>
                                We do not sell user data. Information may only be shared internally when required for billing, security, or disciplinary purposes.
                            </Typography>

                            <Divider sx={{ my: 4 }} />


                        </CustomTabPanel>
                    </Box>
                </Paper>
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Questions? Contact us at{' '}
                        <MuiLink 
                            href="mailto:sonothamin.112@gmail.com" 
                            color="primary" 
                            sx={{ fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                            sonothamin.112@gmail.com
                        </MuiLink>
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}